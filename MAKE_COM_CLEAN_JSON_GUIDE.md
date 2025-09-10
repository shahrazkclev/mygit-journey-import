# Make.com Clean JSON Structure - Updated Guide

## ✅ Updated JSON Payloads (Clean Structure)

### **Opt-in Webhook JSON Structure:**
```json
{
  "action": "optin",
  "password": "shahzrp11",
  "email": "user@example.com",
  "name": "John Doe",
  "tags": ["newsletter", "product-updates"],
  "campaign": "Summer Sale 2025",
  "product": "premium-course",
  "timestamp": "2025-01-09T15:30:00.000Z",
  "source": "website"
}
```

### **Review Submission Webhook JSON Structure:**
```json
{
  "action": "review_submission", 
  "password": "shahzrp11",
  "email": "reviewer@example.com",
  "name": "@john_doe",
  "instagram_handle": "john_doe",
  "rating": 5,
  "description": "Amazing product! Highly recommend...",
  "media_url": "https://r2-url.com/media.mp4",
  "media_url_optimized": "https://r2-url.com/media.mp4",
  "media_type": "video",
  "profile_picture_url": "https://r2-url.com/avatar.jpg",
  "timestamp": "2025-01-09T15:30:00.000Z",
  "source": "website",
  "is_active": false
}
```

## Make.com Variable Access (No More Nested Data!)

### **For Opt-in Webhooks:**
- `{{1.action}}` → "optin" 
- `{{1.password}}` → "shahzrp11"
- `{{1.email}}` → User email
- `{{1.name}}` → User name
- `{{1.tags}}` → Array of tags
- `{{1.campaign}}` → Campaign name
- `{{1.product}}` → Product name
- `{{1.timestamp}}` → Submission time
- `{{1.source}}` → "website"

### **For Review Submissions:**
- `{{1.action}}` → "review_submission"
- `{{1.password}}` → "shahzrp11" 
- `{{1.email}}` → Reviewer email
- `{{1.name}}` → Display name
- `{{1.instagram_handle}}` → Instagram handle
- `{{1.rating}}` → Star rating (1-5)
- `{{1.description}}` → Review text
- `{{1.media_url}}` → Photo/video URL
- `{{1.media_type}}` → "image" or "video"
- `{{1.profile_picture_url}}` → Avatar URL
- `{{1.is_active}}` → false (pending approval)

## ✅ Updated Make.com HTTP Setup (No API Keys Needed!)

### **Simple HTTP Post to Your Database:**
```
URL: https://mixifcnokcmxarpzwfiy.supabase.co/rest/v1/reviews
Method: POST
Headers:
  - Content-Type: application/json
  - apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peGlmY25va2NteGFycHp3Zml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NjYwNTEsImV4cCI6MjA2OTA0MjA1MX0.-4uIuzcHcDGS20-dtKbjVFOtpBSmwYhT9Bgt6KA-dXI

Body (JSON):
{
  "user_email": "{{1.email}}",
  "user_name": "{{1.name}}",
  "user_instagram_handle": "{{1.instagram_handle}}",
  "user_avatar": "{{1.profile_picture_url}}",
  "rating": {{1.rating}},
  "description": "{{1.description}}",
  "media_url": "{{1.media_url}}",
  "media_type": "{{1.media_type}}",
  "is_active": {{1.is_active}},
  "sort_order": 0
}
```

**Note:** The `apikey` is only needed because the `reviews` table allows public INSERT, but Supabase requires the anon key for API access.

## ✅ Alternative: Direct Supabase Module (Recommended)

### **Using Supabase Integration in Make.com:**
1. **Add Module**: Supabase → Insert a Record
2. **Connection**: 
   - **URL**: `https://mixifcnokcmxarpzwfiy.supabase.co`
   - **API Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peGlmY25va2NteGFycHp3Zml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NjYwNTEsImV4cCI6MjA2OTA0MjA1MX0.-4uIuzcHcDGS20-dtKbjVFOtpBSmwYhT9Bgt6KA-dXI`

3. **Table**: `reviews`
4. **Field Mapping:**
   ```
   user_email: {{1.email}}
   user_name: {{1.name}}
   user_instagram_handle: {{1.instagram_handle}}
   user_avatar: {{1.profile_picture_url}}
   rating: {{1.rating}}
   description: {{1.description}}
   media_url: {{1.media_url}}
   media_type: {{1.media_type}}
   is_active: {{1.is_active}}
   sort_order: 0
   ```

## Key Benefits of Clean Structure:

✅ **No nested objects** - All variables at root level  
✅ **Easy mapping** - Direct access like `{{1.email}}`  
✅ **Cleaner Make.com flows** - Less complex variable paths  
✅ **Better debugging** - Easier to see what data is sent  
✅ **Public table access** - No need for special authentication

## Testing Your Clean JSON:

### **1. Submit Test Review:**
- Go to `/submit-review`
- Complete all steps
- Check Make.com execution logs
- Variables should show as `{{1.email}}`, not `{{1.data.email}}`

### **2. Submit Test Opt-in:**
- Go to `/optin?tags=test&campaign=test`
- Fill form and submit
- Check Make.com execution logs
- Variables should be at root level

### **3. Verify Database Entry:**
The reviews should appear in your Supabase `reviews` table with `is_active: false` (pending approval).

## Why No Special API Keys?

- **Reviews table** has public INSERT policy
- **Only anon key needed** for Supabase API access
- **RLS handles security** - reviews default to pending
- **Admin approval required** to make reviews live
- **Much simpler setup** than complex authentication