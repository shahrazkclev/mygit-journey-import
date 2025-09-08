"""
Cloudflare R2 Upload API Endpoint Example
This is a Python Flask example for handling R2 uploads on the backend.
You can adapt this to your preferred backend framework.
"""

import os
import boto3
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import uuid
from datetime import datetime

app = Flask(__name__)

# R2 Configuration
R2_CONFIG = {
    'bucket_name': os.getenv('R2_BUCKET_NAME', 'your-bucket-name'),
    'access_key_id': os.getenv('R2_ACCESS_KEY_ID', 'your-access-key-id'),
    'secret_access_key': os.getenv('R2_SECRET_ACCESS_KEY', 'your-secret-access-key'),
    'endpoint_url': os.getenv('R2_ENDPOINT_URL', 'https://your-account-id.r2.cloudflarestorage.com'),
    'public_url': os.getenv('R2_PUBLIC_URL', 'https://your-bucket.your-domain.com'),
}

# Initialize R2 client
s3_client = boto3.client(
    's3',
    endpoint_url=R2_CONFIG['endpoint_url'],
    aws_access_key_id=R2_CONFIG['access_key_id'],
    aws_secret_access_key=R2_CONFIG['secret_access_key'],
    region_name='auto'  # R2 uses 'auto' as the region
)

# Allowed file types and sizes
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mov', 'webm', 'avi'}
MAX_FILE_SIZE = 30 * 1024 * 1024  # 30MB

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
            return jsonify({'error': 'File too large. Maximum size is 30MB.'}), 400
        
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

@app.route('/api/delete-from-r2', methods=['DELETE'])
def delete_from_r2():
    """Delete a file from R2"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        
        if not filename:
            return jsonify({'error': 'No filename provided'}), 400
        
        # Delete from R2
        s3_client.delete_object(
            Bucket=R2_CONFIG['bucket_name'],
            Key=filename
        )
        
        return jsonify({'success': True, 'message': 'File deleted successfully'})
        
    except Exception as e:
        return jsonify({'error': f'Delete failed: {str(e)}'}), 500

@app.route('/api/list-r2-files', methods=['GET'])
def list_r2_files():
    """List files in R2 bucket (for debugging)"""
    try:
        prefix = request.args.get('prefix', '')
        
        response = s3_client.list_objects_v2(
            Bucket=R2_CONFIG['bucket_name'],
            Prefix=prefix
        )
        
        files = []
        if 'Contents' in response:
            for obj in response['Contents']:
                files.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'].isoformat(),
                    'url': f"{R2_CONFIG['public_url']}/{obj['Key']}"
                })
        
        return jsonify({'files': files})
        
    except Exception as e:
        return jsonify({'error': f'List failed: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'R2 Upload API'})

if __name__ == '__main__':
    # Set up environment variables
    # export R2_BUCKET_NAME=your-bucket-name
    # export R2_ACCESS_KEY_ID=your-access-key-id
    # export R2_SECRET_ACCESS_KEY=your-secret-access-key
    # export R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
    # export R2_PUBLIC_URL=https://your-bucket.your-domain.com
    
    app.run(debug=True, host='0.0.0.0', port=5000)
