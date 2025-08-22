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

def run_all_tests():
    """Run all backend tests"""
    print("=" * 60)
    print("🚀 Starting Backend API Tests")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    print()
    
    results = {
        "health_check": test_health_check(),
        "create_status": test_create_status_check()[0],
        "get_status": test_get_status_checks(),
        "cors_config": test_cors_configuration(),
        "mongodb_connection": test_mongodb_connection()
    }
    
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