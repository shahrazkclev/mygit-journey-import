# 🚀 Deploy R2 Upload API

## Quick Deploy to Vercel (Recommended)

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Deploy
```bash
# In your project root
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name: r2-upload-api
# - Directory: ./
# - Override settings? No
```

### 3. Set Environment Variables
In Vercel dashboard:
- Go to your project → Settings → Environment Variables
- Add these variables:
  ```
  R2_BUCKET_NAME=reviewshigh
  R2_ACCESS_KEY_ID=dc9e26555bd3c237f3ee002056a9b373
  R2_SECRET_ACCESS_KEY=f8e3a0f1350359468829f01daa2a33d19bde01854403f7392068a17fbefd75c0
  R2_ENDPOINT_URL=https://b5f7bbc74ed9bf4c44b19d1f3b937e22.r2.cloudflarestorage.com
  R2_PUBLIC_URL=https://b5f7bbc74ed9bf4c44b19d1f3b937e22.r2.cloudflarestorage.com/reviewshigh
  ```

### 4. Update Frontend
Replace the API URL in your frontend:
```typescript
// In src/pages/SubmitReview.tsx
const response = await fetch('https://your-app.vercel.app/api/upload-to-r2', {
  method: 'POST',
  body: formData,
});
```

## Alternative: Deploy to Railway

### 1. Create Railway Account
- Go to [railway.app](https://railway.app)
- Sign up with GitHub

### 2. Deploy
- Connect your GitHub repository
- Select your project
- Railway will auto-detect Python and install dependencies

### 3. Set Environment Variables
In Railway dashboard:
- Go to Variables tab
- Add the same environment variables as above

## Alternative: Deploy to Render

### 1. Create Render Account
- Go to [render.com](https://render.com)
- Sign up with GitHub

### 2. Create Web Service
- Connect your GitHub repository
- Choose "Web Service"
- Build Command: `pip install -r requirements.txt`
- Start Command: `python backend/r2-upload-api.py`

### 3. Set Environment Variables
In Render dashboard:
- Go to Environment tab
- Add the same environment variables as above

## Test Your Deployment

### 1. Health Check
```bash
curl https://your-app.vercel.app/health
```

### 2. Upload Test
```bash
curl -X POST https://your-app.vercel.app/api/upload-to-r2 \
  -F "file=@test-image.jpg" \
  -F "type=media"
```

### 3. Use Test Page
- Open `test-r2-final.html` in your browser
- Update the `DEPLOYED_API_URL` with your actual URL
- Test the upload functionality

## Your R2 Configuration

- **Account ID**: `b5f7bbc74ed9bf4c44b19d1f3b937e22`
- **Bucket**: `reviewshigh`
- **Endpoint**: `https://b5f7bbc74ed9bf4c44b19d1f3b937e22.r2.cloudflarestorage.com`
- **Public URL**: `https://b5f7bbc74ed9bf4c44b19d1f3b937e22.r2.cloudflarestorage.com/reviewshigh`

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure CORS is enabled in your API
2. **File Size**: Check 50MB limit
3. **File Type**: Only images and videos allowed
4. **Credentials**: Verify R2 credentials are correct

### Debug Steps

1. **Test R2 Connection**:
   ```bash
   python test-r2-bucket.py
   ```

2. **Test Local API**:
   ```bash
   python backend/r2-upload-api.py
   ```

3. **Check Logs**: Look at deployment platform logs for errors

## Next Steps

1. **Deploy the API** using one of the methods above
2. **Update your frontend** with the new API URL
3. **Test the complete flow** from submit review to R2 upload
4. **Monitor usage** and costs in Cloudflare dashboard

Your R2 setup is ready to go! 🎉
