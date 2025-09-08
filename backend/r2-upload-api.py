"""
Simple R2 Upload API for testing
This is a basic Flask API that can be deployed to handle R2 uploads
"""

import os
import boto3
from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# R2 Configuration - Set these as environment variables
R2_CONFIG = {
    'bucket_name': os.getenv('R2_BUCKET_NAME', 'reviewshigh'),
    'access_key_id': os.getenv('R2_ACCESS_KEY_ID', 'dc9e26555bd3c237f3ee002056a9b373'),
    'secret_access_key': os.getenv('R2_SECRET_ACCESS_KEY', 'f8e3a0f1350359468829f01daa2a33d19bde01854403f7392068a17fbefd75c0'),
    'endpoint_url': os.getenv('R2_ENDPOINT_URL', 'https://b5f7bbc74ed9bf4c44b19d1f3b937e22.r2.cloudflarestorage.com'),
    'public_url': os.getenv('R2_PUBLIC_URL', 'https://b5f7bbc74ed9bf4c44b19d1f3b937e22.r2.cloudflarestorage.com/reviewshigh'),
}

# Initialize R2 client only if credentials are provided
s3_client = None
if R2_CONFIG['access_key_id'] and R2_CONFIG['secret_access_key']:
    try:
        s3_client = boto3.client(
            's3',
            endpoint_url=R2_CONFIG['endpoint_url'],
            aws_access_key_id=R2_CONFIG['access_key_id'],
            aws_secret_access_key=R2_CONFIG['secret_access_key'],
            region_name='auto'
        )
        print("R2 client initialized successfully")
    except Exception as e:
        print(f"Failed to initialize R2 client: {e}")
        s3_client = None

# Allowed file types and sizes
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mov', 'webm', 'avi'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_unique_filename(original_filename, prefix=''):
    """Generate a unique filename"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_id = str(uuid.uuid4())[:8]
    extension = original_filename.rsplit('.', 1)[1].lower()
    
    if prefix:
        return f"{prefix}/{timestamp}_{unique_id}.{extension}"
    return f"{timestamp}_{unique_id}.{extension}"

@app.route('/api/upload-to-r2', methods=['POST'])
def upload_to_r2():
    """Handle file upload to Cloudflare R2"""
    try:
        # Check if R2 is configured
        if not s3_client:
            return jsonify({'error': 'R2 not configured'}), 503
        
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file size
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': f'File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB.'}), 400
        
        # Check file type
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Get upload type (media or avatar)
        upload_type = request.form.get('type', 'media')
        
        # Generate unique filename
        unique_filename = generate_unique_filename(file.filename, upload_type)
        
        # Upload to R2
        try:
            s3_client.upload_fileobj(
                file,
                R2_CONFIG['bucket_name'],
                unique_filename,
                ExtraArgs={
                    'ContentType': file.content_type,
                    'ACL': 'public-read'  # Make file publicly accessible
                }
            )
        except Exception as e:
            return jsonify({'error': f'Upload failed: {str(e)}'}), 500
        
        # Generate public URL
        public_url = f"{R2_CONFIG['public_url']}/{unique_filename}"
        
        return jsonify({
            'success': True,
            'url': public_url,
            'filename': unique_filename,
            'size': file_size,
            'type': file.content_type
        })
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy', 
        'service': 'R2 Upload API',
        'r2_configured': s3_client is not None
    })

@app.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({
        'message': 'R2 Upload API',
        'endpoints': ['/api/upload-to-r2', '/health'],
        'r2_configured': s3_client is not None
    })

if __name__ == '__main__':
    # Set up environment variables
    # export R2_BUCKET_NAME=pixel-puff-reviews
    # export R2_ACCESS_KEY_ID=your-access-key-id
    # export R2_SECRET_ACCESS_KEY=your-secret-access-key
    # export R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
    # export R2_PUBLIC_URL=https://your-bucket.your-domain.com
    
    app.run(debug=True, host='0.0.0.0', port=5000)
