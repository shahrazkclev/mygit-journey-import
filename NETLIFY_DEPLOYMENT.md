# 🚀 Netlify Deployment Guide for Email Campaign Manager

## Files Added for Netlify Support

✅ **Created deployment files:**
- `netlify.toml` - Main Netlify configuration
- `frontend/_redirects` - SPA routing support
- `frontend/public/_redirects` - Backup redirects file
- `frontend/.env.production` - Production environment variables
- `build-netlify.sh` - Custom build script

## Netlify Configuration Steps

### 1. Repository Setup
```bash
# Your repository should be pushed to GitHub with these files included
```

### 2. Netlify Site Settings
- **Build Command**: `npm run build`
- **Publish Directory**: `frontend/build`
- **Base Directory**: `frontend`
- **Node Version**: 18

### 3. Environment Variables (Required)
Set these in Netlify Dashboard → Site Settings → Environment Variables:

```
VITE_SUPABASE_PROJECT_ID=mixifcnokcmxarpzwfiy
VITE_SUPABASE_URL=https://mixifcnokcmxarpzwfiy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peGlmY25va2NteGFycHp3Zml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NjYwNTEsImV4cCI6MjA2OTA0MjA1MX0.-4uIuzcHcDGS20-dtKbjVFOtpBSmwYhT9Bgt6KA-dXI
```

### 4. Backend URL (Important!)
You'll need to deploy your backend separately and then set:
```
VITE_REACT_APP_BACKEND_URL=https://your-backend-url.com
```

## Common Issues & Solutions

### ❌ "Page Not Found" Error
**Cause**: Missing SPA redirect rules
**Solution**: The `_redirects` file should fix this

### ❌ Build Fails
**Cause**: Missing dependencies or environment variables
**Solution**: Check build logs and ensure all environment variables are set

### ❌ Blank White Page
**Cause**: Environment variables not set correctly
**Solution**: Verify all VITE_ prefixed variables are in Netlify

### ❌ API Calls Fail
**Cause**: Backend URL not set or backend not deployed
**Solution**: Deploy backend first, then set VITE_REACT_APP_BACKEND_URL

## Netlify Build Settings

In Netlify Dashboard:
1. **Build Command**: `npm run build`
2. **Publish Directory**: `frontend/build`
3. **Base Directory**: `frontend`
4. **Node Version**: 18 (in Environment Variables)

## Manual Build Test
```bash
# Test the build locally first
cd frontend
npm install
npm run build
```

## Frontend-Only Deployment
If you want to deploy just the frontend (without backend features):
1. Remove backend API calls
2. Use Supabase functions instead
3. Set environment variables properly

## Need Help?
- Check Netlify build logs for specific errors
- Ensure all environment variables have VITE_ prefix
- Verify repository has all the deployment files
- Test build locally before deploying

## Files Structure After Setup
```
your-repo/
├── netlify.toml
├── build-netlify.sh
├── NETLIFY_DEPLOYMENT.md
└── frontend/
    ├── _redirects
    ├── public/
    │   └── _redirects
    ├── .env.production
    └── ... (your app files)
```