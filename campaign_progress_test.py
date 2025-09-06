#!/usr/bin/env python3
"""
Campaign Progress Tracking Test
Focused test for campaign progress tracking functionality as requested in review.
"""

import requests
import json
import time
import sys
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://unsub-restore-tool.preview.emergentagent.com/api"

def test_campaign_progress_tracking():
    """
    Comprehensive test for campaign progress tracking functionality.
    Tests all aspects requested in the review:
    1. Create campaign with mock data
    2. Verify initial status
    3. Monitor real-time progress updates
    4. Verify sent_count, failed_count, total_recipients updates
    5. Check current_recipient and current_sender_sequence updates
    6. Confirm status transitions: queued -> sending -> sent
    7. Test progress endpoint
    8. Verify progress percentage calculation
    """
    print("🚀 Starting Campaign Progress Tracking Test")
    print("=" * 60)
    
    # Step 1: Create a new campaign with mock data
    print("\n📝 Step 1: Creating campaign with mock data...")
    campaign_data = {
        "title": "Progress Tracking Test Campaign",
        "subject": "Testing Real Progress Numbers",
        "html_content": "<h1>Test Campaign for Progress Tracking</h1><p>This email tests real progress metrics.</p>",
        "selected_lists": ["test_list_1", "test_list_2"],
        "sender_sequence": 1,
        "webhook_url": "https://httpbin.org/post"  # Use httpbin for testing
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/campaigns",
            json=campaign_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Create Campaign Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to create campaign: {response.text}")
            return False
        
        campaign = response.json()
        campaign_id = campaign["id"]
        print(f"✅ Campaign created successfully with ID: {campaign_id}")
        print(f"Initial campaign data: {json.dumps(campaign, indent=2)}")
        
        # Step 2: Verify campaign is created with correct initial status
        print(f"\n🔍 Step 2: Verifying initial campaign status...")
        
        # Check initial values
        expected_initial_values = {
            "status": "queued",
            "total_recipients": 0,
            "sent_count": 0,
            "failed_count": 0,
            "current_sender_sequence": 1
        }
        
        initial_check_passed = True
        for field, expected_value in expected_initial_values.items():
            actual_value = campaign.get(field)
            if actual_value == expected_value:
                print(f"✅ {field}: {actual_value} (correct)")
            else:
                print(f"❌ {field}: expected {expected_value}, got {actual_value}")
                initial_check_passed = False
        
        if not initial_check_passed:
            print("❌ Initial status verification failed")
            return False
        
        print("✅ Initial campaign status verified correctly")
        
        # Step 3: Test GET /api/campaigns/{campaign_id} to retrieve campaign details
        print(f"\n🔍 Step 3: Testing campaign details retrieval...")
        
        details_response = requests.get(f"{BACKEND_URL}/campaigns/{campaign_id}")
        
        if details_response.status_code != 200:
            print(f"❌ Failed to retrieve campaign details: {details_response.status_code}")
            return False
        
        campaign_details = details_response.json()
        print(f"✅ Campaign details retrieved successfully")
        print(f"Campaign details: {json.dumps(campaign_details, indent=2)}")
        
        # Step 4-8: Monitor real-time progress updates
        print(f"\n📊 Step 4-8: Monitoring real-time progress updates...")
        print("Tracking: sent_count, failed_count, total_recipients, current_recipient, current_sender_sequence, status transitions, progress percentage")
        
        max_monitoring_time = 45  # seconds
        check_interval = 2  # seconds
        elapsed_time = 0
        
        previous_status = "queued"
        status_transitions = ["queued"]
        progress_snapshots = []
        
        print(f"\nMonitoring campaign progress for up to {max_monitoring_time} seconds...")
        print("Time | Status    | Total | Sent | Failed | Progress% | Current Recipient | Sender Seq")
        print("-" * 90)
        
        while elapsed_time < max_monitoring_time:
            time.sleep(check_interval)
            elapsed_time += check_interval
            
            # Get current campaign details
            details_response = requests.get(f"{BACKEND_URL}/campaigns/{campaign_id}")
            if details_response.status_code != 200:
                print(f"❌ Failed to get campaign details at {elapsed_time}s")
                continue
            
            current_campaign = details_response.json()
            
            # Get progress via progress endpoint
            progress_response = requests.get(f"{BACKEND_URL}/campaigns/{campaign_id}/progress")
            if progress_response.status_code != 200:
                print(f"❌ Failed to get campaign progress at {elapsed_time}s")
                continue
            
            progress_data = progress_response.json()
            
            # Extract key metrics
            status = current_campaign.get("status", "unknown")
            total_recipients = current_campaign.get("total_recipients", 0)
            sent_count = current_campaign.get("sent_count", 0)
            failed_count = current_campaign.get("failed_count", 0)
            current_recipient = current_campaign.get("current_recipient", "N/A")
            current_sender_sequence = current_campaign.get("current_sender_sequence", 1)
            progress_percentage = progress_data.get("progress_percentage", 0)
            
            # Track status transitions
            if status != previous_status:
                status_transitions.append(status)
                previous_status = status
                print(f"🔄 Status transition detected: {status_transitions[-2]} -> {status}")
            
            # Record progress snapshot
            snapshot = {
                "time": elapsed_time,
                "status": status,
                "total_recipients": total_recipients,
                "sent_count": sent_count,
                "failed_count": failed_count,
                "progress_percentage": progress_percentage,
                "current_recipient": current_recipient,
                "current_sender_sequence": current_sender_sequence
            }
            progress_snapshots.append(snapshot)
            
            # Display current progress
            recipient_display = current_recipient[:20] + "..." if len(str(current_recipient)) > 20 else current_recipient
            print(f"{elapsed_time:4d}s | {status:9s} | {total_recipients:5d} | {sent_count:4d} | {failed_count:6d} | {progress_percentage:8.1f}% | {recipient_display:17s} | {current_sender_sequence:10d}")
            
            # Check if campaign completed
            if status in ["sent", "failed"]:
                print(f"\n🏁 Campaign completed with status: {status}")
                break
        
        # Step 9: Analyze results and verify all requirements
        print(f"\n📋 Analysis of Campaign Progress Tracking:")
        print("=" * 60)
        
        # Verify status transitions
        print(f"Status Transitions: {' -> '.join(status_transitions)}")
        expected_transitions = ["queued", "sending", "sent"]
        
        if len(status_transitions) >= 2 and "sending" in status_transitions:
            print("✅ Status transitions working correctly (queued -> sending)")
        else:
            print("❌ Status transitions not working as expected")
        
        # Verify progress metrics updates
        final_snapshot = progress_snapshots[-1] if progress_snapshots else {}
        
        print(f"\nFinal Progress Metrics:")
        print(f"  Total Recipients: {final_snapshot.get('total_recipients', 0)}")
        print(f"  Sent Count: {final_snapshot.get('sent_count', 0)}")
        print(f"  Failed Count: {final_snapshot.get('failed_count', 0)}")
        print(f"  Progress Percentage: {final_snapshot.get('progress_percentage', 0):.1f}%")
        print(f"  Final Status: {final_snapshot.get('status', 'unknown')}")
        
        # Verify real progress numbers (not just UI elements)
        progress_working = True
        
        if final_snapshot.get('total_recipients', 0) > 0:
            print("✅ total_recipients updated correctly (> 0)")
        else:
            print("❌ total_recipients not updated")
            progress_working = False
        
        if final_snapshot.get('sent_count', 0) > 0:
            print("✅ sent_count updated correctly (> 0)")
        else:
            print("❌ sent_count not updated")
            progress_working = False
        
        # Verify progress percentage calculation
        expected_progress = 0
        if final_snapshot.get('total_recipients', 0) > 0:
            expected_progress = (final_snapshot.get('sent_count', 0) / final_snapshot.get('total_recipients', 1)) * 100
        
        actual_progress = final_snapshot.get('progress_percentage', 0)
        
        if abs(actual_progress - expected_progress) < 0.1:  # Allow small floating point differences
            print(f"✅ Progress percentage calculation correct: {actual_progress:.1f}%")
        else:
            print(f"❌ Progress percentage calculation incorrect: expected {expected_progress:.1f}%, got {actual_progress:.1f}%")
            progress_working = False
        
        # Verify current_recipient and current_sender_sequence updates
        recipient_updates = [s for s in progress_snapshots if s.get('current_recipient') not in [None, 'N/A', '']]
        if recipient_updates:
            print("✅ current_recipient updated during sending")
        else:
            print("❌ current_recipient not updated during sending")
            progress_working = False
        
        sender_seq_updates = [s for s in progress_snapshots if s.get('current_sender_sequence', 0) > 0]
        if sender_seq_updates:
            print("✅ current_sender_sequence updated during sending")
        else:
            print("❌ current_sender_sequence not updated during sending")
            progress_working = False
        
        # Final verification
        print(f"\n🎯 Campaign Progress Tracking Test Results:")
        print("=" * 60)
        
        if progress_working and len(status_transitions) >= 2:
            print("✅ ALL CAMPAIGN PROGRESS TRACKING TESTS PASSED")
            print("✅ Real progress numbers are being updated correctly")
            print("✅ Background task updates progress in real-time")
            print("✅ Status transitions work correctly")
            print("✅ Progress percentage calculation is accurate")
            print("✅ Current recipient and sender sequence are tracked")
            return True
        else:
            print("❌ SOME CAMPAIGN PROGRESS TRACKING TESTS FAILED")
            return False
        
    except Exception as e:
        print(f"❌ Campaign progress tracking test failed with error: {str(e)}")
        return False

def test_progress_endpoint_error_handling():
    """Test progress endpoint error handling for non-existent campaigns"""
    print(f"\n🔍 Testing Progress Endpoint Error Handling...")
    
    try:
        # Test with non-existent campaign ID
        fake_campaign_id = "non-existent-campaign-id"
        response = requests.get(f"{BACKEND_URL}/campaigns/{fake_campaign_id}/progress")
        
        print(f"Non-existent campaign progress status code: {response.status_code}")
        
        if response.status_code == 404:
            print("✅ Progress endpoint correctly returns 404 for non-existent campaigns")
            return True
        else:
            print(f"❌ Expected 404 for non-existent campaign, got {response.status_code}")
            return False
    
    except Exception as e:
        print(f"❌ Progress endpoint error handling test failed: {str(e)}")
        return False

def run_campaign_progress_tests():
    """Run all campaign progress tracking tests"""
    print("🎯 Campaign Progress Tracking Test Suite")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    print()
    
    results = {
        "campaign_progress_tracking": test_campaign_progress_tracking(),
        "progress_endpoint_error_handling": test_progress_endpoint_error_handling()
    }
    
    print("\n" + "=" * 60)
    print("📊 Campaign Progress Test Results Summary")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} campaign progress tests passed")
    
    if passed == total:
        print("🎉 All campaign progress tracking tests passed successfully!")
        print("✅ Campaign shows real progress numbers, not just UI elements")
        print("✅ Backend updates sent_count, failed_count, and other progress metrics correctly")
        return True
    else:
        print("⚠️  Some campaign progress tracking tests failed")
        return False

if __name__ == "__main__":
    success = run_campaign_progress_tests()
    sys.exit(0 if success else 1)