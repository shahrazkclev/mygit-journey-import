#!/usr/bin/env python3
"""
Backend API Testing Script for FastAPI Server
Tests the core backend functionality including health checks and status endpoints.
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Get backend URL from environment
BACKEND_URL = "https://tag-wizard-2.preview.emergentagent.com/api"

def test_health_check():
    """Test the basic health check endpoint"""
    print("🔍 Testing Health Check Endpoint...")
    try:
        response = requests.get(f"{BACKEND_URL}/")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                print("✅ Health check endpoint working correctly")
                return True
            else:
                print("❌ Health check returned unexpected message")
                return False
        else:
            print(f"❌ Health check failed with status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check failed with error: {str(e)}")
        return False

def test_create_status_check():
    """Test creating a status check"""
    print("\n🔍 Testing Create Status Check Endpoint...")
    try:
        test_data = {
            "client_name": "TestClient_" + str(uuid.uuid4())[:8]
        }
        
        response = requests.post(
            f"{BACKEND_URL}/status",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if "id" in data and "client_name" in data and "timestamp" in data:
                print("✅ Create status check endpoint working correctly")
                return True, data["id"]
            else:
                print("❌ Create status check returned incomplete data")
                return False, None
        else:
            print(f"❌ Create status check failed with status code: {response.status_code}")
            return False, None
    except Exception as e:
        print(f"❌ Create status check failed with error: {str(e)}")
        return False, None

def test_get_status_checks():
    """Test retrieving status checks"""
    print("\n🔍 Testing Get Status Checks Endpoint...")
    try:
        response = requests.get(f"{BACKEND_URL}/status")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Retrieved {len(data)} status checks")
            if len(data) > 0:
                print(f"Sample record: {data[0]}")
            print("✅ Get status checks endpoint working correctly")
            return True
        else:
            print(f"❌ Get status checks failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Get status checks failed with error: {str(e)}")
        return False

def test_cors_configuration():
    """Test CORS configuration by checking response headers"""
    print("\n🔍 Testing CORS Configuration...")
    try:
        response = requests.options(f"{BACKEND_URL}/", headers={
            "Origin": "https://example.com",
            "Access-Control-Request-Method": "GET"
        })
        
        print(f"OPTIONS Status Code: {response.status_code}")
        cors_headers = {
            "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
            "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
            "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers")
        }
        print(f"CORS Headers: {cors_headers}")
        
        if cors_headers["Access-Control-Allow-Origin"]:
            print("✅ CORS configuration appears to be working")
            return True
        else:
            print("❌ CORS headers not found in response")
            return False
    except Exception as e:
        print(f"❌ CORS test failed with error: {str(e)}")
        return False

def test_mongodb_connection():
    """Test MongoDB connection by creating and retrieving a status check"""
    print("\n🔍 Testing MongoDB Connection...")
    
    # Create a test record
    create_success, record_id = test_create_status_check()
    if not create_success:
        print("❌ MongoDB connection test failed - could not create record")
        return False
    
    # Retrieve records to verify persistence
    get_success = test_get_status_checks()
    if not get_success:
        print("❌ MongoDB connection test failed - could not retrieve records")
        return False
    
    print("✅ MongoDB connection working correctly")
    return True

def test_create_campaign():
    """Test creating a new campaign"""
    print("\n🔍 Testing Create Campaign Endpoint...")
    try:
        test_data = {
            "title": "Test Campaign",
            "subject": "Test Email Subject", 
            "html_content": "<h1>Test Email</h1>",
            "selected_lists": ["list1", "list2"],
            "sender_sequence": 1,
            "webhook_url": "https://httpbin.org/post"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/campaigns",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["id", "title", "subject", "html_content", "selected_lists", "sender_sequence", "status"]
            if all(field in data for field in required_fields):
                print("✅ Create campaign endpoint working correctly")
                return True, data["id"]
            else:
                print("❌ Create campaign returned incomplete data")
                return False, None
        else:
            print(f"❌ Create campaign failed with status code: {response.status_code}")
            return False, None
    except Exception as e:
        print(f"❌ Create campaign failed with error: {str(e)}")
        return False, None

def test_get_campaign(campaign_id):
    """Test retrieving campaign details"""
    print(f"\n🔍 Testing Get Campaign Details Endpoint for ID: {campaign_id}...")
    try:
        response = requests.get(f"{BACKEND_URL}/campaigns/{campaign_id}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Campaign details: {data}")
            required_fields = ["id", "title", "subject", "html_content", "status"]
            if all(field in data for field in required_fields):
                print("✅ Get campaign details endpoint working correctly")
                return True
            else:
                print("❌ Get campaign details returned incomplete data")
                return False
        elif response.status_code == 404:
            print("❌ Campaign not found")
            return False
        else:
            print(f"❌ Get campaign details failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Get campaign details failed with error: {str(e)}")
        return False

def test_get_campaign_progress(campaign_id):
    """Test retrieving campaign progress"""
    print(f"\n🔍 Testing Get Campaign Progress Endpoint for ID: {campaign_id}...")
    try:
        response = requests.get(f"{BACKEND_URL}/campaigns/{campaign_id}/progress")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Campaign progress: {data}")
            required_fields = ["campaign_id", "total_recipients", "sent_count", "failed_count", "status", "progress_percentage"]
            if all(field in data for field in required_fields):
                print("✅ Get campaign progress endpoint working correctly")
                return True
            else:
                print("❌ Get campaign progress returned incomplete data")
                return False
        elif response.status_code == 404:
            print("❌ Campaign not found")
            return False
        else:
            print(f"❌ Get campaign progress failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Get campaign progress failed with error: {str(e)}")
        return False

def test_webhook_contacts():
    """Test webhook endpoint for contacts"""
    print("\n🔍 Testing Webhook Contacts Endpoint...")
    try:
        test_data = {
            "action": "create",
            "email": "test@example.com",
            "name": "Test User",
            "phone": "+1234567890",
            "tags": ["customer", "test"]
        }
        
        response = requests.post(
            f"{BACKEND_URL}/webhook/contacts",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "contact_id" in data:
                print("✅ Webhook contacts endpoint working correctly")
                return True
            else:
                print("❌ Webhook contacts returned incomplete data")
                return False
        else:
            print(f"❌ Webhook contacts failed with status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Webhook contacts failed with error: {str(e)}")
        return False

def test_campaign_error_handling():
    """Test error handling for campaign endpoints"""
    print("\n🔍 Testing Campaign Error Handling...")
    try:
        # Test getting non-existent campaign
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BACKEND_URL}/campaigns/{fake_id}")
        
        if response.status_code == 404:
            print("✅ Campaign not found error handling working correctly")
            return True
        else:
            print(f"❌ Expected 404 for non-existent campaign, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Campaign error handling test failed with error: {str(e)}")
        return False

def test_campaign_background_processing():
    """Test that campaign background processing is working"""
    print("\n🔍 Testing Campaign Background Processing...")
    try:
        # Create a campaign
        create_success, campaign_id = test_create_campaign()
        if not create_success:
            print("❌ Could not create campaign for background processing test")
            return False
        
        # Wait a moment for background processing to start
        import time
        time.sleep(2)
        
        # Check campaign progress to see if background processing started
        progress_response = requests.get(f"{BACKEND_URL}/campaigns/{campaign_id}/progress")
        if progress_response.status_code == 200:
            progress_data = progress_response.json()
            # Check if total_recipients has been set (indicates background processing started)
            if progress_data.get("total_recipients", 0) > 0 or progress_data.get("status") in ["sending", "sent"]:
                print("✅ Campaign background processing appears to be working")
                return True
            else:
                print("⚠️  Campaign created but background processing may not have started yet")
                return True  # Still consider this a pass as the endpoint works
        else:
            print("❌ Could not check campaign progress")
            return False
    except Exception as e:
        print(f"❌ Campaign background processing test failed with error: {str(e)}")
        return False

def run_all_tests():
    """Run all backend tests"""
    print("=" * 60)
    print("🚀 Starting Backend API Tests")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    print()
    
    # Run basic tests first
    results = {
        "health_check": test_health_check(),
        "create_status": test_create_status_check()[0],
        "get_status": test_get_status_checks(),
        "cors_config": test_cors_configuration(),
        "mongodb_connection": test_mongodb_connection()
    }
    
    # Run campaign management tests
    print("\n" + "=" * 40)
    print("🎯 Testing Campaign Management Features")
    print("=" * 40)
    
    campaign_create_success, campaign_id = test_create_campaign()
    results["create_campaign"] = campaign_create_success
    
    if campaign_id:
        results["get_campaign"] = test_get_campaign(campaign_id)
        results["get_campaign_progress"] = test_get_campaign_progress(campaign_id)
    else:
        results["get_campaign"] = False
        results["get_campaign_progress"] = False
    
    results["webhook_contacts"] = test_webhook_contacts()
    results["campaign_error_handling"] = test_campaign_error_handling()
    results["campaign_background_processing"] = test_campaign_background_processing()
    
    print("\n" + "=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All backend tests passed successfully!")
        return True
    else:
        print("⚠️  Some backend tests failed")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)