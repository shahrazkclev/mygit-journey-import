# R2 Upload API Deployment Guide

This guide explains how to deploy the R2 upload API for handling media uploads in your review system.

## Quick Setup

### 1. Environment Variables

Set these environment variables in your deployment platform:

```env
R2_BUCKET_NAME=pixel-puff-reviews
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://your-bucket.your-domain.com
```

### 2. Deploy to Vercel

1. Create a new Vercel project
2. Upload the `backend/r2-upload-api.py` file
3. Set the environment variables in Vercel dashboard
4. Deploy

### 3. Deploy to Railway

1. Create a new Railway project
2. Connect your GitHub repository
3. Set the environment variables in Railway dashboard
4. Deploy

### 4. Deploy to Render

1. Create a new Web Service on Render
2. Connect your repository
3. Set the environment variables
4. Deploy

## Local Testing

1. Install dependencies:
```bash
pip install -r backend/requirements-r2.txt
```

2. Set environment variables:
```bash
export R2_BUCKET_NAME=pixel-puff-reviews
export R2_ACCESS_KEY_ID=your-access-key-id
export R2_SECRET_ACCESS_KEY=your-secret-access-key
export R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
export R2_PUBLIC_URL=https://your-bucket.your-domain.com
```

3. Run the server:
```bash
python backend/r2-upload-api.py
```

4. Test the endpoint:
```bash
curl -X POST http://localhost:5000/api/upload-to-r2 \
  -F "file=@test-image.jpg" \
  -F "type=media"
```

## API Endpoints

### POST /api/upload-to-r2

Upload a file to R2 storage.

**Request:**
- `file`: The file to upload
- `type`: Upload type (media or avatar)

**Response:**
```json
{
  "success": true,
  "url": "https://your-bucket.your-domain.com/media/20240101_120000_abc123.jpg",
  "filename": "media/20240101_120000_abc123.jpg",
  "size": 1024000,
  "type": "image/jpeg"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "R2 Upload API",
  "r2_configured": true
}
```

## Security Notes

1. **API Keys**: Never commit R2 credentials to version control
2. **CORS**: The API has CORS enabled for frontend requests
3. **File Validation**: Files are validated for type and size
4. **Rate Limiting**: Consider adding rate limiting for production use

## Fallback Behavior

If R2 is not configured or fails, the frontend will automatically fall back to Supabase storage, ensuring the upload functionality always works.

## Troubleshooting

### Common Issues

1. **R2 not configured**: Check environment variables
2. **Upload fails**: Verify R2 bucket permissions
3. **CORS errors**: Ensure CORS is enabled in your deployment

### Debug Mode

Set `FLASK_DEBUG=1` for detailed error messages during development.
