# 🚀 Netlify Deployment Guide for Email Campaign Manager

## ✅ BUILD ISSUE FIXED!
The Radix UI build error has been resolved by removing the problematic manual chunks configuration.

## Files Added for Netlify Support

✅ **Created deployment files:**
- `netlify.toml` - Main Netlify configuration (UPDATED)
- `frontend/_redirects` - SPA routing support
- `frontend/public/_redirects` - Backup redirects file
- `frontend/.env.production` - Production environment variables
- `build-netlify.sh` - Custom build script

## Netlify Configuration Steps

### 1. Repository Setup
```bash
# Push ALL files to your GitHub repository, including the deployment files
```

### 2. Netlify Site Settings
- **Build Command**: `npm ci && npm run build`
- **Publish Directory**: `frontend/build`
- **Base Directory**: `frontend`
- **Node Version**: 18

### 3. Environment Variables (Required)
Set these in Netlify Dashboard → Site Settings → Environment Variables:

```
NODE_VERSION=18
VITE_SUPABASE_PROJECT_ID=mixifcnokcmxarpzwfiy
VITE_SUPABASE_URL=https://mixifcnokcmxarpzwfiy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peGlmY25va2NteGFycHp3Zml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NjYwNTEsImV4cCI6MjA2OTA0MjA1MX0.-4uIuzcHcDGS20-dtKbjVFOtpBSmwYhT9Bgt6KA-dXI
```

### 4. Backend URL (Optional for frontend-only)
If you deploy the backend separately:
```
VITE_REACT_APP_BACKEND_URL=https://your-backend-url.com
```

## Troubleshooting Common Issues

### ❌ Build Error: "Cannot resolve @radix-ui/react-button"
**Status**: ✅ FIXED - Updated vite.config.ts to remove problematic chunks

### ❌ "Page Not Found" Error
**Cause**: Missing SPA redirect rules
**Solution**: ✅ FIXED - `_redirects` files added

### ❌ Build Command Issues
**Cause**: Wrong build command or base directory
**Solution**: Use exactly these settings:
- Base Directory: `frontend`
- Build Command: `npm ci && npm run build`
- Publish Directory: `frontend/build`

### ❌ Environment Variables Not Working
**Cause**: Missing VITE_ prefix or not set in Netlify
**Solution**: All frontend env vars must start with `VITE_`

### ❌ Build Timeout
**Cause**: Large dependencies taking too long
**Solution**: The build is optimized and should complete in ~2-3 minutes

## Quick Deploy Checklist

✅ Files pushed to GitHub:
- [ ] `netlify.toml` (root of repo)
- [ ] `frontend/_redirects`
- [ ] `frontend/public/_redirects`
- [ ] `frontend/.env.production`

✅ Netlify Settings:
- [ ] Base Directory: `frontend`
- [ ] Build Command: `npm ci && npm run build`
- [ ] Publish Directory: `frontend/build`

✅ Environment Variables in Netlify:
- [ ] `NODE_VERSION=18`
- [ ] `VITE_SUPABASE_PROJECT_ID=mixifcnokcmxarpzwfiy`
- [ ] `VITE_SUPABASE_URL=https://mixifcnokcmxarpzwfiy.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Test Build Locally First
```bash
cd frontend
npm install
npm run build
# Should complete successfully without errors
```

## What Works Without Backend
- All UI components and navigation
- Product management (stored in Supabase)
- Contact management (stored in Supabase)
- List management (stored in Supabase)
- Theme customization
- Campaign creation (stored in Supabase)

## What Needs Backend
- Campaign sending with webhooks
- Real-time progress tracking
- Advanced sender sequence rotation

## Frontend-Only Mode
The app will work great as a frontend-only application using Supabase for data storage. The campaign management will work but sending will be disabled.

## Need Help?
1. Check Netlify build logs for specific errors
2. Verify all files are in your GitHub repo
3. Ensure environment variables are set correctly
4. Test build locally first with `npm run build`

Your app should now deploy successfully to Netlify! 🎉