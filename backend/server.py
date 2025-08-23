from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import httpx
import asyncio
import json


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class CampaignCreate(BaseModel):
    title: str
    subject: str
    html_content: str
    selected_lists: List[str]
    sender_sequence: int = 1
    webhook_url: Optional[str] = None

class Campaign(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subject: str
    html_content: str
    selected_lists: List[str]
    sender_sequence: int
    webhook_url: Optional[str]
    status: str = "queued"  # queued, sending, sent, failed, paused
    total_recipients: int = 0
    sent_count: int = 0
    failed_count: int = 0
    current_sender_sequence: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

class WebhookPayload(BaseModel):
    action: str
    email: str
    name: str
    phone: Optional[str] = None
    tags: List[str] = []

class CampaignProgress(BaseModel):
    campaign_id: str
    total_recipients: int
    sent_count: int
    failed_count: int
    status: str
    progress_percentage: float
    current_recipient: Optional[str] = None
    error_message: Optional[str] = None

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.get("/auth/verify")
async def verify_auth():
    """Verify if user is authenticated"""
    return {"email": "anonymous", "authenticated": True}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Campaign Management Endpoints
@api_router.post("/campaigns", response_model=Campaign)
async def create_campaign(campaign_data: CampaignCreate, background_tasks: BackgroundTasks):
    campaign_dict = campaign_data.dict()
    campaign = Campaign(**campaign_dict)
    
    # Insert campaign into database
    await db.campaigns.insert_one(campaign.dict())
    
    # Start campaign sending in background
    background_tasks.add_task(send_campaign_background, campaign.id)
    
    return campaign

@api_router.get("/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str):
    campaign_doc = await db.campaigns.find_one({"id": campaign_id})
    if not campaign_doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return Campaign(**campaign_doc)

@api_router.get("/campaigns/{campaign_id}/progress", response_model=CampaignProgress)
async def get_campaign_progress(campaign_id: str):
    campaign_doc = await db.campaigns.find_one({"id": campaign_id})
    if not campaign_doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign = Campaign(**campaign_doc)
    progress_percentage = 0
    if campaign.total_recipients > 0:
        progress_percentage = (campaign.sent_count / campaign.total_recipients) * 100
    
    return CampaignProgress(
        campaign_id=campaign.id,
        total_recipients=campaign.total_recipients,
        sent_count=campaign.sent_count,
        failed_count=campaign.failed_count,
        status=campaign.status,
        progress_percentage=progress_percentage,
        error_message=campaign.error_message
    )

@api_router.post("/campaigns/{campaign_id}/pause")
async def pause_campaign(campaign_id: str):
    result = await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": "paused"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign paused"}

@api_router.post("/campaigns/{campaign_id}/resume")
async def resume_campaign(campaign_id: str, background_tasks: BackgroundTasks):
    result = await db.campaigns.update_one(
        {"id": campaign_id, "status": "paused"},
        {"$set": {"status": "sending"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found or not paused")
    
    # Resume campaign sending
    background_tasks.add_task(send_campaign_background, campaign_id)
    return {"message": "Campaign resumed"}

# Webhook endpoint for receiving contact data
@api_router.post("/webhook/contacts")
async def webhook_contacts(payload: WebhookPayload):
    try:
        # Log the webhook call
        logging.info(f"Webhook received: {payload.dict()}")
        
        # Process the webhook data (e.g., add to contacts)
        contact_data = {
            "id": str(uuid.uuid4()),
            "email": payload.email,
            "name": payload.name,
            "phone": payload.phone,
            "tags": payload.tags,
            "action": payload.action,
            "created_at": datetime.utcnow(),
            "source": "webhook"
        }
        
        # Store in webhook_contacts collection for tracking
        await db.webhook_contacts.insert_one(contact_data)
        
        return {"message": "Webhook processed successfully", "contact_id": contact_data["id"]}
    
    except Exception as e:
        logging.error(f"Webhook processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")

# Background task for sending campaigns
async def send_campaign_background(campaign_id: str):
    try:
        # Get campaign details
        campaign_doc = await db.campaigns.find_one({"id": campaign_id})
        if not campaign_doc:
            logging.error(f"Campaign {campaign_id} not found")
            return
        
        campaign = Campaign(**campaign_doc)
        
        # Get sender rotation settings
        settings_doc = await db.campaign_settings.find_one({})  # Get first available settings
        emails_per_sender = 50  # default
        max_sender_sequence = 3  # default
        
        if settings_doc:
            emails_per_sender = settings_doc.get("emails_per_sender", 50)
            max_sender_sequence = settings_doc.get("max_sender_sequence", 3)
        
        # Update status to sending
        await db.campaigns.update_one(
            {"id": campaign_id},
            {"$set": {"status": "sending", "started_at": datetime.utcnow()}}
        )
        
        # Get actual recipients from the selected lists
        recipients = []
        
        # For each selected list, get the contacts
        for list_id in campaign.selected_lists:
            # Get contacts from contact_lists table
            contact_list_docs = await db.contact_lists.find({"list_id": list_id}).to_list(length=None)
            
            for contact_list in contact_list_docs:
                # Get the actual contact details
                contact_doc = await db.contacts.find_one({"id": contact_list["contact_id"]})
                if contact_doc:
                    # Combine first_name and last_name, or use email if no name
                    name = ""
                    if contact_doc.get("first_name"):
                        name = contact_doc["first_name"]
                        if contact_doc.get("last_name"):
                            name += " " + contact_doc["last_name"]
                    
                    if not name:
                        # Generate name from email if no name exists
                        email_local = contact_doc["email"].split('@')[0]
                        name = email_local.replace('.', ' ').replace('_', ' ').replace('-', ' ').title()
                    
                    recipient = {
                        "email": contact_doc["email"],
                        "name": name,
                        "contact_id": contact_doc["id"]
                    }
                    
                    # Avoid duplicates if contact is in multiple lists
                    if not any(r["email"] == recipient["email"] for r in recipients):
                        recipients.append(recipient)
        
        # If no real contacts found, use a smaller mock list for testing
        if not recipients:
            recipients = [
                {"email": "test1@example.com", "name": "Test User 1", "contact_id": "mock1"},
                {"email": "test2@example.com", "name": "Test User 2", "contact_id": "mock2"},
                {"email": "test3@example.com", "name": "Test User 3", "contact_id": "mock3"},
            ]
            logging.warning(f"No real contacts found for campaign {campaign_id}, using mock data")
        
        total_recipients = len(recipients)
        logging.info(f"Campaign {campaign_id} starting with {total_recipients} recipients")
        
        await db.campaigns.update_one(
            {"id": campaign_id},
            {"$set": {"total_recipients": total_recipients}}
        )
        
        sent_count = 0
        failed_count = 0
        current_sender_sequence = 1
        
        for i, recipient in enumerate(recipients):
            # Check if campaign is paused
            current_campaign = await db.campaigns.find_one({"id": campaign_id})
            if current_campaign and current_campaign["status"] == "paused":
                logging.info(f"Campaign {campaign_id} paused, stopping sending")
                return
            
            # Calculate sender sequence based on emails sent
            # Every 'emails_per_sender' emails, increment the sequence
            current_sender_sequence = ((sent_count // emails_per_sender) % max_sender_sequence) + 1
            
            try:
                # Update current recipient in campaign
                await db.campaigns.update_one(
                    {"id": campaign_id},
                    {"$set": {"current_recipient": recipient["email"]}}
                )
                
                # Send email via webhook with sender sequence
                if campaign.webhook_url:
                    success = await send_email_via_webhook(
                        campaign.webhook_url,
                        recipient,
                        campaign.subject,
                        campaign.html_content,
                        current_sender_sequence
                    )
                    if success:
                        sent_count += 1
                        logging.info(f"✅ Email {sent_count} sent to {recipient['email']} with sender sequence {current_sender_sequence}")
                    else:
                        failed_count += 1
                        logging.error(f"❌ Failed to send email to {recipient['email']}")
                else:
                    # Simulate sending without webhook
                    await asyncio.sleep(0.5)  # Simulate processing time
                    sent_count += 1
                    logging.info(f"✅ Email {sent_count} simulated to {recipient['email']} with sender sequence {current_sender_sequence}")
                
                # Update progress
                progress_percentage = (sent_count / total_recipients) * 100 if total_recipients > 0 else 0
                
                await db.campaigns.update_one(
                    {"id": campaign_id},
                    {"$set": {
                        "sent_count": sent_count,
                        "failed_count": failed_count,
                        "current_sender_sequence": current_sender_sequence,
                        "current_recipient": recipient["email"]
                    }}
                )
                
                logging.info(f"Campaign {campaign_id} progress: {sent_count}/{total_recipients} ({progress_percentage:.1f}%)")
                
            except Exception as e:
                failed_count += 1
                logging.error(f"Failed to send to {recipient['email']}: {e}")
        
        # Mark campaign as completed
        await db.campaigns.update_one(
            {"id": campaign_id},
            {"$set": {
                "status": "sent" if failed_count == 0 else "failed",
                "completed_at": datetime.utcnow(),
                "sent_count": sent_count,
                "failed_count": failed_count,
                "current_recipient": None  # Clear current recipient when completed
            }}
        )
        
        logging.info(f"Campaign {campaign_id} completed: {sent_count} sent, {failed_count} failed")
        
    except Exception as e:
        logging.error(f"Campaign sending error: {e}")
        await db.campaigns.update_one(
            {"id": campaign_id},
            {"$set": {
                "status": "failed",
                "error_message": str(e),
                "completed_at": datetime.utcnow()
            }}
        )

async def send_email_via_webhook(webhook_url: str, recipient: Dict[str, Any], subject: str, html_content: str, sender_sequence: int = 1) -> bool:
    try:
        # Debug: Log sending details
        logging.info(f"📧 Sending email to: {recipient['email']} with sender sequence {sender_sequence}")
        
        payload = {
            "to": recipient["email"],
            "name": recipient.get("name", ""),
            "subject": subject,
            "html": html_content,  # Send clean HTML directly to Make.com
            "sender_sequence": sender_sequence,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(webhook_url, json=payload)
            
        if response.status_code == 200:
            logging.info(f"Email sent successfully to {recipient['email']} with sender sequence {sender_sequence}")
            return True
        else:
            logging.error(f"Webhook failed for {recipient['email']}: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logging.error(f"Webhook error for {recipient['email']}: {e}")
        return False

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
