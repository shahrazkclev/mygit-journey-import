# Video Compression Setup Guide

## Overview
Your video compression system is now ready! Here's what has been implemented:

### ✅ What's Done
1. **Supabase Edge Function** (`supabase/functions/compress-video/index.ts`)
   - Downloads videos from R2
   - Compresses using FFmpeg with configurable settings
   - Uploads optimized version with `_optimized` suffix
   - Updates review with optimized URL

2. **Database Migration** (`supabase/migrations/20241201_add_media_url_optimized.sql`)
   - Adds `media_url_optimized` column to reviews table
   - Includes performance index

3. **Frontend Controls** (Updated `ReviewsManager.tsx`)
   - Compression dialog with settings
   - Video display shows optimized version when available
   - "Compress Video" button for uncompressed videos
   - Progress indicators and success feedback

## 🚀 Setup Steps

### 1. Deploy the Migration
```bash
cd supabase
supabase db push
```

### 2. Deploy the Edge Function
```bash
supabase functions deploy compress-video
```

### 3. Set Environment Variables
In your Supabase project dashboard, go to **Settings > Edge Functions > Environment Variables** and add:

```
R2_ACCESS_KEY=your_r2_access_key
R2_SECRET_KEY=your_r2_secret_key
R2_BUCKET=your_bucket_name
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://your_public_domain.com
```

### 4. Test the System
1. Go to your Reviews Manager
2. Find a video review
3. Click "Compress Video" button
4. Adjust settings in the dialog:
   - **Resolution**: 480p, 720p, 1080p, 1440p
   - **Max File Size**: 1-50MB
   - **Quality**: 10%-100%
5. Click "Compress Video"
6. Wait for completion (progress shown)
7. Optimized video will be used automatically

## 🎯 Features

### Compression Settings
- **Resolution Options**: 480p, 720p, 1080p, 1440p
- **Aspect Ratio Handling**: Automatically maintains aspect ratio with padding
- **File Size Control**: Set maximum file size limit
- **Quality Control**: Slider from 10% to 100% quality
- **Smart Compression**: Uses CRF encoding for optimal quality/size balance

### User Experience
- **Visual Indicators**: Green checkmark shows when optimized version is active
- **Progress Feedback**: Shows compression progress and results
- **Automatic Fallback**: Uses original if compression fails
- **Size Reporting**: Shows before/after file sizes and compression ratio

### Technical Details
- **FFmpeg Processing**: Server-side compression using industry-standard tools
- **R2 Integration**: Uses your existing Cloudflare R2 setup
- **Optimized URLs**: Compressed videos get `_optimized` suffix
- **Database Updates**: Automatically updates review records
- **Error Handling**: Graceful fallback and user feedback

## 🔧 How It Works

1. **User clicks "Compress Video"** → Opens compression dialog
2. **User adjusts settings** → Resolution, file size, quality
3. **User clicks "Compress"** → Calls Supabase Edge Function
4. **Edge Function downloads** → Original video from R2
5. **FFmpeg compresses** → Using specified settings
6. **Uploads optimized** → New file with `_optimized` suffix
7. **Updates database** → Sets `media_url_optimized` field
8. **UI updates** → Shows optimized version and success message

## 🎨 UI Components

### Video Display
- Shows optimized version when available
- Falls back to original if no optimized version
- Green indicator when optimized version is active
- "Compress Video" button for uncompressed videos

### Compression Dialog
- Resolution selector (480p to 1440p)
- File size limit input (1-50MB)
- Quality slider (10%-100%)
- Live preview of settings
- Progress indicator during compression

## 🚨 Important Notes

1. **FFmpeg Required**: The Edge Function requires FFmpeg to be available in the Deno runtime
2. **R2 Credentials**: Make sure your R2 environment variables are correctly set
3. **File Size Limits**: Respect your R2 bucket limits and pricing
4. **Processing Time**: Large videos may take several minutes to compress
5. **Storage Costs**: Optimized videos will use additional R2 storage

## 🐛 Troubleshooting

### Common Issues
- **"FFmpeg not found"**: Ensure FFmpeg is available in Supabase Edge Functions
- **"R2 upload failed"**: Check your R2 credentials and bucket permissions
- **"Video too large"**: Adjust compression settings or file size limits
- **"Compression failed"**: Check Edge Function logs in Supabase dashboard

### Debug Steps
1. Check Supabase Edge Function logs
2. Verify R2 environment variables
3. Test with smaller video files first
4. Check network connectivity and permissions

## 🎉 You're Ready!

Your video compression system is now fully functional. Users can compress videos directly from the reviews dashboard with full control over quality, resolution, and file size. The system automatically handles aspect ratios and provides a seamless user experience.
