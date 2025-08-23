#!/usr/bin/env python3
"""
Final Campaign Progress Test
Comprehensive test with slower processing to capture current_recipient updates
"""

import requests
import json
import time
import sys

BACKEND_URL = "https://micro-edits.preview.emergentagent.com/api"

def test_campaign_with_slower_processing():
    """Test campaign with no webhook to get slower processing"""
    print("🔍 Testing Campaign Progress with Slower Processing")
    print("=" * 60)
    
    # Create campaign without webhook for slower processing
    campaign_data = {
        "title": "Slow Progress Test Campaign",
        "subject": "Testing Current Recipient Field",
        "html_content": "<h1>Test Campaign</h1>",
        "selected_lists": ["test"],
        "sender_sequence": 1,
        "webhook_url": None  # No webhook = slower simulated processing
    }
    
    response = requests.post(f"{BACKEND_URL}/campaigns", json=campaign_data)
    if response.status_code != 200:
        print(f"❌ Failed to create campaign: {response.status_code}")
        return False
    
    campaign = response.json()
    campaign_id = campaign["id"]
    print(f"✅ Campaign created: {campaign_id}")
    print(f"Initial status: {campaign.get('status')}")
    
    # Monitor with very frequent checks
    max_time = 30
    interval = 0.2  # Check every 200ms
    elapsed = 0
    
    current_recipients_seen = []
    all_snapshots = []
    
    print("\nMonitoring campaign progress every 200ms:")
    print("Time | Status    | Total | Sent | Failed | Current Recipient")
    print("-" * 70)
    
    while elapsed < max_time:
        time.sleep(interval)
        elapsed += interval
        
        details_response = requests.get(f"{BACKEND_URL}/campaigns/{campaign_id}")
        if details_response.status_code == 200:
            campaign_details = details_response.json()
            
            status = campaign_details.get("status", "unknown")
            total = campaign_details.get("total_recipients", 0)
            sent = campaign_details.get("sent_count", 0)
            failed = campaign_details.get("failed_count", 0)
            current_recipient = campaign_details.get("current_recipient")
            
            # Track unique current_recipient values
            if current_recipient and current_recipient not in current_recipients_seen:
                current_recipients_seen.append(current_recipient)
                print(f"🎯 NEW RECIPIENT DETECTED: {current_recipient}")
            
            # Store snapshot
            snapshot = {
                "time": elapsed,
                "status": status,
                "total": total,
                "sent": sent,
                "failed": failed,
                "current_recipient": current_recipient
            }
            all_snapshots.append(snapshot)
            
            recipient_display = str(current_recipient)[:25] if current_recipient else "None"
            print(f"{elapsed:5.1f}s | {status:9s} | {total:5d} | {sent:4d} | {failed:6d} | {recipient_display}")
            
            if status in ["sent", "failed"]:
                print(f"\n🏁 Campaign completed with status: {status}")
                break
    
    # Analysis
    print(f"\n📊 Analysis:")
    print(f"Total snapshots captured: {len(all_snapshots)}")
    print(f"Unique current_recipients seen: {len(current_recipients_seen)}")
    
    for i, recipient in enumerate(current_recipients_seen, 1):
        print(f"  {i}. {recipient}")
    
    # Check if we saw any current_recipient updates
    non_none_recipients = [s for s in all_snapshots if s["current_recipient"] is not None]
    
    print(f"\nSnapshots with non-None current_recipient: {len(non_none_recipients)}")
    
    if len(current_recipients_seen) > 0:
        print("✅ current_recipient field is being updated during sending")
        return True
    elif len(non_none_recipients) > 0:
        print("✅ current_recipient field was updated (even if we didn't catch unique values)")
        return True
    else:
        print("❌ current_recipient field was never updated during sending")
        return False

def test_comprehensive_campaign_functionality():
    """Comprehensive test of all campaign progress functionality"""
    print("\n🎯 Comprehensive Campaign Progress Functionality Test")
    print("=" * 60)
    
    # Create campaign with webhook for realistic testing
    campaign_data = {
        "title": "Comprehensive Test Campaign",
        "subject": "Testing All Progress Features",
        "html_content": "<h1>Comprehensive Test</h1><p>Testing all progress tracking features.</p>",
        "selected_lists": ["test_list_1", "test_list_2"],
        "sender_sequence": 1,
        "webhook_url": "https://httpbin.org/post"
    }
    
    print("1. Creating campaign...")
    response = requests.post(f"{BACKEND_URL}/campaigns", json=campaign_data)
    if response.status_code != 200:
        print(f"❌ Failed to create campaign: {response.status_code}")
        return False
    
    campaign = response.json()
    campaign_id = campaign["id"]
    print(f"✅ Campaign created: {campaign_id}")
    
    # Test initial state
    print("\n2. Verifying initial state...")
    initial_checks = {
        "status": campaign.get("status") == "queued",
        "total_recipients": campaign.get("total_recipients") == 0,
        "sent_count": campaign.get("sent_count") == 0,
        "failed_count": campaign.get("failed_count") == 0,
        "current_sender_sequence": campaign.get("current_sender_sequence") == 1
    }
    
    for check, passed in initial_checks.items():
        status = "✅" if passed else "❌"
        print(f"  {status} {check}: {campaign.get(check)}")
    
    if not all(initial_checks.values()):
        print("❌ Initial state verification failed")
        return False
    
    # Test campaign details endpoint
    print("\n3. Testing campaign details endpoint...")
    details_response = requests.get(f"{BACKEND_URL}/campaigns/{campaign_id}")
    if details_response.status_code != 200:
        print(f"❌ Failed to get campaign details: {details_response.status_code}")
        return False
    print("✅ Campaign details endpoint working")
    
    # Test progress endpoint
    print("\n4. Testing progress endpoint...")
    progress_response = requests.get(f"{BACKEND_URL}/campaigns/{campaign_id}/progress")
    if progress_response.status_code != 200:
        print(f"❌ Failed to get campaign progress: {progress_response.status_code}")
        return False
    
    progress_data = progress_response.json()
    required_progress_fields = ["campaign_id", "total_recipients", "sent_count", "failed_count", "status", "progress_percentage"]
    
    progress_checks = {field: field in progress_data for field in required_progress_fields}
    
    for field, present in progress_checks.items():
        status = "✅" if present else "❌"
        print(f"  {status} {field}: {progress_data.get(field)}")
    
    if not all(progress_checks.values()):
        print("❌ Progress endpoint missing required fields")
        return False
    
    print("✅ Progress endpoint working correctly")
    
    # Monitor campaign execution
    print("\n5. Monitoring campaign execution...")
    max_time = 20
    interval = 1
    elapsed = 0
    
    status_transitions = []
    final_metrics = {}
    
    while elapsed < max_time:
        time.sleep(interval)
        elapsed += interval
        
        # Get current state
        details_response = requests.get(f"{BACKEND_URL}/campaigns/{campaign_id}")
        progress_response = requests.get(f"{BACKEND_URL}/campaigns/{campaign_id}/progress")
        
        if details_response.status_code == 200 and progress_response.status_code == 200:
            campaign_details = details_response.json()
            progress_data = progress_response.json()
            
            status = campaign_details.get("status")
            
            # Track status transitions
            if not status_transitions or status_transitions[-1] != status:
                status_transitions.append(status)
                print(f"  🔄 Status: {status}")
            
            # Store final metrics
            final_metrics = {
                "status": status,
                "total_recipients": campaign_details.get("total_recipients", 0),
                "sent_count": campaign_details.get("sent_count", 0),
                "failed_count": campaign_details.get("failed_count", 0),
                "progress_percentage": progress_data.get("progress_percentage", 0),
                "current_sender_sequence": campaign_details.get("current_sender_sequence", 1)
            }
            
            if status in ["sent", "failed"]:
                print(f"  🏁 Campaign completed: {status}")
                break
    
    # Final verification
    print("\n6. Final verification...")
    
    # Check status transitions
    expected_transitions = ["queued", "sending", "sent"]
    transitions_ok = len(status_transitions) >= 2 and "sending" in status_transitions
    
    print(f"  Status transitions: {' -> '.join(status_transitions)}")
    print(f"  ✅ Status transitions working" if transitions_ok else "  ❌ Status transitions not working")
    
    # Check final metrics
    metrics_ok = (
        final_metrics.get("total_recipients", 0) > 0 and
        final_metrics.get("sent_count", 0) > 0 and
        final_metrics.get("progress_percentage", 0) == 100.0
    )
    
    print(f"  Final metrics:")
    print(f"    Total recipients: {final_metrics.get('total_recipients', 0)}")
    print(f"    Sent count: {final_metrics.get('sent_count', 0)}")
    print(f"    Progress percentage: {final_metrics.get('progress_percentage', 0):.1f}%")
    print(f"    Current sender sequence: {final_metrics.get('current_sender_sequence', 1)}")
    
    print(f"  ✅ Final metrics correct" if metrics_ok else "  ❌ Final metrics incorrect")
    
    # Overall result
    overall_success = transitions_ok and metrics_ok
    
    print(f"\n🎯 Overall Result: {'✅ SUCCESS' if overall_success else '❌ FAILURE'}")
    
    return overall_success

def run_final_tests():
    """Run final comprehensive campaign tests"""
    print("🚀 Final Campaign Progress Tracking Tests")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    
    results = {
        "slow_processing_test": test_campaign_with_slower_processing(),
        "comprehensive_functionality": test_comprehensive_campaign_functionality()
    }
    
    print("\n" + "=" * 60)
    print("📊 Final Test Results Summary")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} final tests passed")
    
    if passed == total:
        print("🎉 All final campaign progress tests passed!")
        return True
    else:
        print("⚠️  Some final campaign progress tests failed")
        return False

if __name__ == "__main__":
    success = run_final_tests()
    sys.exit(0 if success else 1)