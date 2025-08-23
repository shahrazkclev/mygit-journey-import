#!/usr/bin/env python3
"""
Detailed Campaign Progress Test
More granular test to check current_recipient updates
"""

import requests
import json
import time
import sys

BACKEND_URL = "https://micro-edits.preview.emergentagent.com/api"

def test_current_recipient_updates():
    """Test current_recipient field updates in detail"""
    print("🔍 Detailed Current Recipient Updates Test")
    print("=" * 50)
    
    # Create campaign
    campaign_data = {
        "title": "Current Recipient Test",
        "subject": "Testing Current Recipient Field",
        "html_content": "<h1>Test</h1>",
        "selected_lists": ["test"],
        "sender_sequence": 1,
        "webhook_url": "https://httpbin.org/post"
    }
    
    response = requests.post(f"{BACKEND_URL}/campaigns", json=campaign_data)
    if response.status_code != 200:
        print(f"❌ Failed to create campaign: {response.status_code}")
        return False
    
    campaign = response.json()
    campaign_id = campaign["id"]
    print(f"✅ Campaign created: {campaign_id}")
    
    # Monitor with very short intervals to catch current_recipient updates
    max_time = 20
    interval = 0.5  # Check every 500ms
    elapsed = 0
    
    current_recipients_seen = []
    
    print("\nMonitoring current_recipient field every 500ms:")
    print("Time | Status    | Sent | Current Recipient")
    print("-" * 50)
    
    while elapsed < max_time:
        time.sleep(interval)
        elapsed += interval
        
        # Get campaign details
        details_response = requests.get(f"{BACKEND_URL}/campaigns/{campaign_id}")
        if details_response.status_code == 200:
            campaign_details = details_response.json()
            
            status = campaign_details.get("status", "unknown")
            sent_count = campaign_details.get("sent_count", 0)
            current_recipient = campaign_details.get("current_recipient")
            
            # Track unique current_recipient values
            if current_recipient and current_recipient not in current_recipients_seen:
                current_recipients_seen.append(current_recipient)
                print(f"🎯 NEW RECIPIENT: {current_recipient}")
            
            recipient_display = str(current_recipient)[:30] if current_recipient else "None"
            print(f"{elapsed:4.1f}s | {status:9s} | {sent_count:4d} | {recipient_display}")
            
            if status in ["sent", "failed"]:
                break
    
    print(f"\nCurrent recipients seen during sending: {len(current_recipients_seen)}")
    for i, recipient in enumerate(current_recipients_seen, 1):
        print(f"  {i}. {recipient}")
    
    if len(current_recipients_seen) > 0:
        print("✅ current_recipient field is being updated during sending")
        return True
    else:
        print("❌ current_recipient field is not being updated during sending")
        return False

def test_sender_sequence_updates():
    """Test current_sender_sequence field updates"""
    print("\n🔍 Detailed Sender Sequence Updates Test")
    print("=" * 50)
    
    # Create campaign
    campaign_data = {
        "title": "Sender Sequence Test",
        "subject": "Testing Sender Sequence Field",
        "html_content": "<h1>Test</h1>",
        "selected_lists": ["test"],
        "sender_sequence": 1,
        "webhook_url": "https://httpbin.org/post"
    }
    
    response = requests.post(f"{BACKEND_URL}/campaigns", json=campaign_data)
    if response.status_code != 200:
        print(f"❌ Failed to create campaign: {response.status_code}")
        return False
    
    campaign = response.json()
    campaign_id = campaign["id"]
    print(f"✅ Campaign created: {campaign_id}")
    
    # Monitor sender sequence updates
    max_time = 20
    interval = 1
    elapsed = 0
    
    sender_sequences_seen = []
    
    print("\nMonitoring current_sender_sequence field:")
    print("Time | Status    | Sent | Sender Sequence")
    print("-" * 45)
    
    while elapsed < max_time:
        time.sleep(interval)
        elapsed += interval
        
        details_response = requests.get(f"{BACKEND_URL}/campaigns/{campaign_id}")
        if details_response.status_code == 200:
            campaign_details = details_response.json()
            
            status = campaign_details.get("status", "unknown")
            sent_count = campaign_details.get("sent_count", 0)
            sender_sequence = campaign_details.get("current_sender_sequence", 1)
            
            if sender_sequence not in sender_sequences_seen:
                sender_sequences_seen.append(sender_sequence)
            
            print(f"{elapsed:4d}s | {status:9s} | {sent_count:4d} | {sender_sequence:15d}")
            
            if status in ["sent", "failed"]:
                break
    
    print(f"\nSender sequences seen: {sender_sequences_seen}")
    
    if len(sender_sequences_seen) > 0 and all(seq >= 1 for seq in sender_sequences_seen):
        print("✅ current_sender_sequence field is working correctly")
        return True
    else:
        print("❌ current_sender_sequence field has issues")
        return False

def test_progress_percentage_accuracy():
    """Test progress percentage calculation accuracy"""
    print("\n🔍 Progress Percentage Accuracy Test")
    print("=" * 50)
    
    # Create campaign
    campaign_data = {
        "title": "Progress Percentage Test",
        "subject": "Testing Progress Calculation",
        "html_content": "<h1>Test</h1>",
        "selected_lists": ["test"],
        "sender_sequence": 1,
        "webhook_url": "https://httpbin.org/post"
    }
    
    response = requests.post(f"{BACKEND_URL}/campaigns", json=campaign_data)
    if response.status_code != 200:
        print(f"❌ Failed to create campaign: {response.status_code}")
        return False
    
    campaign = response.json()
    campaign_id = campaign["id"]
    print(f"✅ Campaign created: {campaign_id}")
    
    # Monitor progress percentage accuracy
    max_time = 20
    interval = 1
    elapsed = 0
    
    progress_calculations = []
    
    print("\nMonitoring progress percentage accuracy:")
    print("Time | Total | Sent | Failed | Expected% | Actual% | Match")
    print("-" * 65)
    
    while elapsed < max_time:
        time.sleep(interval)
        elapsed += interval
        
        # Get both campaign details and progress endpoint
        details_response = requests.get(f"{BACKEND_URL}/campaigns/{campaign_id}")
        progress_response = requests.get(f"{BACKEND_URL}/campaigns/{campaign_id}/progress")
        
        if details_response.status_code == 200 and progress_response.status_code == 200:
            campaign_details = details_response.json()
            progress_data = progress_response.json()
            
            total = campaign_details.get("total_recipients", 0)
            sent = campaign_details.get("sent_count", 0)
            failed = campaign_details.get("failed_count", 0)
            status = campaign_details.get("status", "unknown")
            
            # Calculate expected progress
            expected_progress = 0
            if total > 0:
                expected_progress = (sent / total) * 100
            
            actual_progress = progress_data.get("progress_percentage", 0)
            
            # Check if they match (within 0.1% tolerance)
            match = abs(expected_progress - actual_progress) < 0.1
            match_symbol = "✅" if match else "❌"
            
            progress_calculations.append({
                "expected": expected_progress,
                "actual": actual_progress,
                "match": match
            })
            
            print(f"{elapsed:4d}s | {total:5d} | {sent:4d} | {failed:6d} | {expected_progress:8.1f}% | {actual_progress:6.1f}% | {match_symbol}")
            
            if status in ["sent", "failed"]:
                break
    
    # Analyze results
    all_matches = all(calc["match"] for calc in progress_calculations)
    
    if all_matches and len(progress_calculations) > 0:
        print("✅ Progress percentage calculations are accurate")
        return True
    else:
        print("❌ Progress percentage calculations have issues")
        return False

if __name__ == "__main__":
    print("🎯 Detailed Campaign Progress Analysis")
    print("=" * 60)
    
    results = {
        "current_recipient_updates": test_current_recipient_updates(),
        "sender_sequence_updates": test_sender_sequence_updates(),
        "progress_percentage_accuracy": test_progress_percentage_accuracy()
    }
    
    print("\n" + "=" * 60)
    print("📊 Detailed Test Results")
    print("=" * 60)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    passed = sum(results.values())
    total = len(results)
    print(f"\nOverall: {passed}/{total} detailed tests passed")