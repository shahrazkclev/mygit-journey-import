# Cloudflare R2 Integration Guide

This guide explains how to integrate Cloudflare R2 for file uploads in your reviews system, replacing the current Supabase storage implementation.

## Overview

Cloudflare R2 is a cost-effective object storage service that's S3-compatible. It offers:
- Lower egress costs compared to AWS S3
- Global CDN integration
- S3-compatible API
- Built-in caching

## Setup Steps

### 1. Create R2 Bucket

1. Log in to your Cloudflare dashboard
2. Navigate to R2 Object Storage
3. Create a new bucket (e.g., `pixel-puff-reviews`)
4. Configure public access if needed

### 2. Generate API Tokens

1. Go to "Manage R2 API tokens"
2. Create a new token with:
   - Read and Write permissions
   - Access to your specific bucket
3. Save the Access Key ID and Secret Access Key

### 3. Configure Environment Variables

Create a `.env` file in your backend:

```env
R2_BUCKET_NAME=pixel-puff-reviews
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://your-bucket.your-domain.com
```

### 4. Set Up Custom Domain (Optional)

1. In your R2 bucket settings, go to "Custom Domains"
2. Add a custom domain (e.g., `media.yourdomain.com`)
3. Configure DNS records as instructed
4. Update `R2_PUBLIC_URL` to use your custom domain

## Implementation

### Backend Setup

1. Install required dependencies:
```bash
pip install boto3 flask python-dotenv
```

2. Use the provided `r2-upload-example.py` as a starting point
3. Deploy to your preferred hosting platform (Vercel, Railway, etc.)

### Frontend Integration

1. Update the upload function in `SubmitReview.tsx`:

```typescript
// Replace the uploadToSupabase function with:
const uploadToR2 = async (file: File, type: 'media' | 'avatar'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  const response = await fetch('/api/upload-to-r2', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const result = await response.json();
  return result.url;
};
```

2. Update the `submitReview` function to use R2:

```typescript
// Upload media if present
if (formData.media) {
  mediaUrl = await uploadToR2(formData.media, 'media');
}

// Upload avatar if present
if (formData.avatar) {
  avatarUrl = await uploadToR2(formData.avatar, 'avatar');
}
```

## File Structure

```
uploads/
├── media/
│   ├── 20241201_143022_a1b2c3d4.mp4
│   ├── 20241201_143045_e5f6g7h8.jpg
│   └── ...
└── avatar/
    ├── 20241201_143100_i9j0k1l2.jpg
    └── ...
```

## Security Considerations

1. **File Validation**: Always validate file types and sizes on both frontend and backend
2. **Access Control**: Use signed URLs for sensitive files
3. **Rate Limiting**: Implement rate limiting on upload endpoints
4. **CORS**: Configure CORS properly for your domain

## Cost Optimization

1. **Lifecycle Policies**: Set up automatic deletion of old files
2. **Compression**: Compress images before upload
3. **CDN**: Use Cloudflare's CDN for faster delivery
4. **Monitoring**: Monitor usage and costs regularly

## Migration from Supabase Storage

1. **Backup**: Export all existing files from Supabase
2. **Upload**: Upload files to R2 maintaining the same structure
3. **Update URLs**: Update database records with new R2 URLs
4. **Test**: Thoroughly test the new implementation
5. **Switch**: Update frontend to use R2 endpoints

## Monitoring and Maintenance

1. **Logs**: Monitor upload success/failure rates
2. **Storage**: Track storage usage and costs
3. **Performance**: Monitor upload/download speeds
4. **Backups**: Implement regular backups of critical files

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure CORS is properly configured
2. **Upload Failures**: Check file size limits and network connectivity
3. **Authentication**: Verify API credentials are correct
4. **Permissions**: Ensure bucket permissions are set correctly

### Debug Endpoints

Use the provided debug endpoints:
- `GET /api/list-r2-files` - List files in bucket
- `GET /health` - Check API health

## Performance Tips

1. **Parallel Uploads**: Upload multiple files simultaneously
2. **Progress Tracking**: Show upload progress to users
3. **Retry Logic**: Implement retry for failed uploads
4. **Optimization**: Compress images and videos before upload

## Example Usage

```typescript
// Upload a review video
const videoFile = new File([videoBlob], 'review.mp4', { type: 'video/mp4' });
const videoUrl = await uploadToR2(videoFile, 'media');

// Upload a user avatar
const avatarFile = new File([avatarBlob], 'avatar.jpg', { type: 'image/jpeg' });
const avatarUrl = await uploadToR2(avatarFile, 'avatar');
```

## Support

For issues with R2 integration:
1. Check Cloudflare R2 documentation
2. Review error logs in your backend
3. Test with smaller files first
4. Verify network connectivity and CORS settings
