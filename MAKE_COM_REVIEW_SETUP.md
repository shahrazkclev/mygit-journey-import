# Make.com Setup: Receive Webhook → Post to Reviews

## Complete Make.com Scenario Setup

### Step 1: Create Webhook Trigger
1. **New Scenario** in Make.com
2. **Add Module**: Webhooks → Custom Webhook
3. **Copy URL**: `https://hook.us2.make.com/fyfqkxjbgnnq4w72wqvd8csdp4flalwv`
4. **Save & Run Once** to generate webhook structure

### Step 2: Add Authentication Filter
1. **Add Filter** after webhook
2. **Condition**: `password` = `shahzrp11`
3. **Label**: "Authenticate Request"

### Step 3: Add Action Filter  
1. **Add Filter** after authentication
2. **Condition**: `action` = `review_submission` 
3. **Label**: "Review Submissions Only"

### Step 4: HTTP Module to Post Back to Your System
1. **Add Module**: HTTP → Make a Request
2. **Configure as follows**:

```
URL: https://mixifcnokcmxarpzwfiy.supabase.co/rest/v1/reviews
Method: POST
Headers:
  - Content-Type: application/json
  - apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peGlmY25va2NteGFycHp3Zml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NjYwNTEsImV4cCI6MjA2OTA0MjA1MX0.-4uIuzcHcDGS20-dtKbjVFOtpBSmwYhT9Bgt6KA-dXI
  - Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peGlmY25va2NteGFycHp3Zml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NjYwNTEsImV4cCI6MjA2OTA0MjA1MX0.-4uIuzcHcDGS20-dtKbjVFOtpBSmwYhT9Bgt6KA-dXI
  - Prefer: return=minimal

Body (JSON):
{
  "user_email": "{{1.data.email}}",
  "user_name": "{{1.data.name}}",
  "user_instagram_handle": "{{1.data.instagram_handle}}",
  "user_avatar": "{{1.data.profile_picture_url}}",
  "rating": {{1.data.rating}},
  "description": "{{1.data.description}}",
  "media_url": "{{1.data.media_url}}",
  "media_type": "{{1.data.media_type}}",
  "is_active": {{1.data.is_active}},
  "sort_order": 0
}
```

## Alternative: Using Supabase Integration

### Option 2: Supabase Direct Integration
1. **Add Module**: Supabase → Insert a Record
2. **Connection**: Create new connection with:
   - **URL**: `https://mixifcnokcmxarpzwfiy.supabase.co`
   - **API Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peGlmY25va2NteGFycHp3Zml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NjYwNTEsImV4cCI6MjA2OTA0MjA1MX0.-4uIuzcHcDGS20-dtKbjVFOtpBSmwYhT9Bgt6KA-dXI`

3. **Configure**:
   - **Table**: `reviews`
   - **Record Data**:
     ```json
     {
       "user_email": "{{1.data.email}}",
       "user_name": "{{1.data.name}}",
       "user_instagram_handle": "{{1.data.instagram_handle}}",
       "user_avatar": "{{1.data.profile_picture_url}}",
       "rating": "{{1.data.rating}}",
       "description": "{{1.data.description}}",
       "media_url": "{{1.data.media_url}}",
       "media_type": "{{1.data.media_type}}",
       "is_active": "{{1.data.is_active}}",
       "sort_order": 0
     }
     ```

## Field Mapping Reference

| Make.com Variable | Database Column | Description |
|-------------------|-----------------|-------------|
| `{{1.data.email}}` | `user_email` | User's email |
| `{{1.data.name}}` | `user_name` | Display name |
| `{{1.data.instagram_handle}}` | `user_instagram_handle` | Instagram handle |
| `{{1.data.profile_picture_url}}` | `user_avatar` | Profile picture URL |
| `{{1.data.rating}}` | `rating` | 1-5 star rating |
| `{{1.data.description}}` | `description` | Review text |
| `{{1.data.media_url}}` | `media_url` | Photo/video URL |
| `{{1.data.media_type}}` | `media_type` | "image" or "video" |
| `{{1.data.is_active}}` | `is_active` | true/false (approval status) |

## Complete Scenario Flow

```
1. [Webhook Trigger] 
   ↓
2. [Filter: password = "shahzrp11"]
   ↓  
3. [Filter: action = "review_submission"]
   ↓
4. [Supabase Insert] or [HTTP Request]
   ↓
5. [Optional: Email Notification]
   ↓
6. [Optional: Slack/Discord Alert]
```

## Testing Your Scenario

### 1. Submit Test Review
- Go to `/submit-review` on your site
- Complete the 3-step form
- Submit review

### 2. Check Make.com
- Go to scenario → Execution history
- Should see successful run with data
- Check if record was inserted in Supabase

### 3. Verify Database
```sql
SELECT * FROM public.reviews 
ORDER BY created_at DESC 
LIMIT 5;
```

## Advanced Features You Can Add

### 1. Duplicate Prevention
Add filter to check if review already exists:
```
HTTP GET to: https://mixifcnokcmxarpzwfiy.supabase.co/rest/v1/reviews?user_email=eq.{{1.data.email}}&description=eq.{{1.data.description}}
```

### 2. Auto-Approval for High Ratings
Add filter: `rating` >= 4 → Set `is_active: true`

### 3. Moderation Queue
For ratings < 4 → Send to moderation system

### 4. Social Media Auto-Post
When `is_active: true` → Post to Instagram/Facebook

## Troubleshooting

### Common Issues:
- **401 Unauthorized**: Check API keys are correct
- **403 Forbidden**: Verify RLS policies allow insert
- **422 Unprocessable**: Check required fields are mapped
- **Webhook not firing**: Ensure scenario is ON

### Debug Steps:
1. Check webhook payload in Make.com logs
2. Test HTTP request manually 
3. Verify Supabase table structure
4. Check RLS policies allow public insert

## Security Notes
- Reviews table allows public INSERT (for submissions)
- `is_active: false` by default (pending approval)
- Only admin can approve via dashboard
- Webhook authenticated with password