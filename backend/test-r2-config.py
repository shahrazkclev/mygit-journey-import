"""
Test script to validate R2 configuration
This will test if your R2 credentials work without running the full server
"""

import os
import boto3
from botocore.exceptions import ClientError, NoCredentialsError

# Your R2 Configuration
R2_CONFIG = {
    'bucket_name': 'reviewshigh',
    'access_key_id': 'dc9e26555bd3c237f3ee002056a9b373',
    'secret_access_key': 'f8e3a0f1350359468829f01daa2a33d19bde01854403f7392068a17fbefd75c0',
    'endpoint_url': 'https://b5f7bbc74ed9bf4c44b19d1f3b937e22.r2.cloudflarestorage.com',
    'public_url': 'https://pub-bd7c46a527764dcdad1ab8745369c5e6.r2.dev',
}

def test_r2_connection():
    """Test R2 connection and bucket access"""
    print("🔍 Testing R2 Configuration...")
    print(f"Bucket: {R2_CONFIG['bucket_name']}")
    print(f"Endpoint: {R2_CONFIG['endpoint_url']}")
    print(f"Public URL: {R2_CONFIG['public_url']}")
    print("-" * 50)
    
    try:
        # Initialize R2 client
        s3_client = boto3.client(
            's3',
            endpoint_url=R2_CONFIG['endpoint_url'],
            aws_access_key_id=R2_CONFIG['access_key_id'],
            aws_secret_access_key=R2_CONFIG['secret_access_key'],
            region_name='auto'
        )
        print("✅ R2 client initialized successfully")
        
        # Test bucket access
        try:
            response = s3_client.head_bucket(Bucket=R2_CONFIG['bucket_name'])
            print("✅ Bucket access confirmed")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                print("❌ Bucket not found - please check bucket name")
                return False
            elif error_code == '403':
                print("❌ Access denied - please check credentials")
                return False
            else:
                print(f"❌ Bucket access error: {error_code}")
                return False
        
        # Test listing objects (to verify permissions)
        try:
            response = s3_client.list_objects_v2(Bucket=R2_CONFIG['bucket_name'], MaxKeys=1)
            print("✅ List permissions confirmed")
        except ClientError as e:
            print(f"⚠️  List permissions issue: {e.response['Error']['Code']}")
        
        # Test upload permissions with a small test file
        try:
            test_content = b"test file content"
            test_key = "test/test-upload.txt"
            
            s3_client.put_object(
                Bucket=R2_CONFIG['bucket_name'],
                Key=test_key,
                Body=test_content,
                ContentType='text/plain'
            )
            print("✅ Upload permissions confirmed")
            
            # Clean up test file
            s3_client.delete_object(Bucket=R2_CONFIG['bucket_name'], Key=test_key)
            print("✅ Delete permissions confirmed")
            
        except ClientError as e:
            print(f"❌ Upload test failed: {e.response['Error']['Code']}")
            return False
        
        print("-" * 50)
        print("🎉 All tests passed! Your R2 configuration is working correctly.")
        print(f"📁 Your files will be accessible at: {R2_CONFIG['public_url']}")
        return True
        
    except NoCredentialsError:
        print("❌ No credentials found")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return False

def test_public_url():
    """Test if the public URL is accessible"""
    import urllib.request
    import urllib.error
    
    print("\n🌐 Testing public URL accessibility...")
    try:
        # Try to access the public URL
        response = urllib.request.urlopen(R2_CONFIG['public_url'], timeout=10)
        print("✅ Public URL is accessible")
        return True
    except urllib.error.URLError as e:
        print(f"⚠️  Public URL not accessible: {e}")
        print("This might be normal if the bucket is empty or has restricted access")
        return False
    except Exception as e:
        print(f"❌ Public URL test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 R2 Configuration Test")
    print("=" * 50)
    
    # Test R2 connection
    r2_works = test_r2_connection()
    
    # Test public URL
    url_works = test_public_url()
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print(f"R2 Connection: {'✅ Working' if r2_works else '❌ Failed'}")
    print(f"Public URL: {'✅ Accessible' if url_works else '⚠️  Not accessible'}")
    
    if r2_works:
        print("\n🎯 Your R2 API is ready to use!")
        print("You can now deploy the r2-upload-api.py to any hosting platform.")
    else:
        print("\n🔧 Please check your R2 credentials and try again.")
