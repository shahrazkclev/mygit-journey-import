# Review Submission Process Guide

## How Reviews Work

### 1. Review Submission Flow
When someone submits a review on `/submit-review`:

1. **Step 1: Basic Info** - User enters email, Instagram handle, uploads profile picture
2. **Step 2: Media Upload** - User uploads photo/video content 
3. **Step 3: Rating & Review** - User gives 1-5 star rating and writes description
4. **Step 4: Submission** - Data goes to Make.com webhook ONLY (Make.com handles database insertion)

### 2. Review Status: "Pending" by Default
All reviews are submitted with `is_active: false` - meaning they're in **pending** status and won't show publicly until an admin approves them.

### 3. Database Structure
Reviews are stored in `public.reviews` table with these fields:
```sql
- id (UUID)
- user_email (text)
- user_name (text) 
- user_instagram_handle (text)
- user_avatar (text - profile picture URL)
- rating (numeric 1-5)
- description (text)
- media_url (text - photo/video URL)
- media_type (text - "image" or "video")
- is_active (boolean - false = pending, true = approved)
- sort_order (integer)
- created_at (timestamp)
```

## Make.com Webhook Integration

### Webhook URL
```
https://hook.us2.make.com/fyfqkxjbgnnq4w72wqvd8csdp4flalwv
```

### JSON Payload Structure
```json
{
  "action": "review_submission",
  "password": "shahzrp11",
  "email": "reviewer@example.com",
  "instagram_handle": "@john_doe", 
  "rating": 5,
  "description": "Amazing product! Love the quality and fast shipping. Highly recommend to everyone!",
  "media_url": "https://r2-url.com/reviews/video123.mp4",
  "media_url_optimized": "https://r2-url.com/reviews/video123.mp4",
  "media_type": "video",
  "profile_picture_url": "https://r2-url.com/avatars/profile456.jpg",
  "timestamp": "2025-01-09T15:30:00.000Z",
  "source": "website",
  "is_active": false
}
```

### Field Descriptions
- **action**: Always "review_submission" for reviews
- **password**: Authentication key "shahzrp11" 
- **email**: User's email address
- **instagram_handle**: Instagram username with @ (automatically added)
- **rating**: Star rating 1-5
- **description**: User's written review text
- **media_url**: Direct URL to uploaded photo/video
- **media_type**: "image" or "video"
- **profile_picture_url**: User's profile photo URL
- **is_active**: false (pending approval)

## Make.com Scenario Setup Guide

### 1. Create New Scenario
1. Go to Make.com dashboard
2. Create new scenario
3. Add "Webhooks" > "Custom Webhook" as trigger

### 2. Webhook Trigger Setup
- Copy webhook URL: `https://hook.us2.make.com/fyfqkxjbgnnq4w72wqvd8csdp4flalwv`
- Set method: POST
- Expected data structure: JSON (see above)

### 3. Add Authentication Filter
Add a filter after webhook trigger:
- Condition: `password` equals `shahzrp11`
- This ensures only authenticated requests are processed

### 4. Add Action Filter  
Add another filter:
- Condition: `action` equals `review_submission`
- This processes only review submissions (not opt-ins)

### 5. Example Actions You Can Add
- **Email notification** to admin about new review
- **Slack/Discord notification** 
- **Google Sheets** logging
- **Approval workflow** trigger
- **Social media posting** (when approved)

### 6. Sample Make.com Data Processing
```javascript
// Access webhook data in Make.com
const reviewData = {
  email: {{1.data.email}},
  rating: {{1.data.rating}},
  description: {{1.data.description}},
  mediaUrl: {{1.data.media_url}},
  instagramHandle: {{1.data.instagram_handle}}
};

// Example: Send email notification
const emailBody = `
New Review Submitted!

From: ${reviewData.email} (${reviewData.instagramHandle})
Rating: ${reviewData.rating}/5 stars
Review: ${reviewData.description}
Media: ${reviewData.mediaUrl}

Status: Pending Approval
`;
```

## Review Approval Process

### Option 1: Admin Dashboard (Recommended)
- Login to dashboard as cgdora4@gmail.com
- Go to Reviews section 
- See all pending reviews (is_active = false)
- Click approve to set is_active = true
- Approved reviews appear on public pages

### Option 2: Direct Database Update
```sql
-- Approve a review
UPDATE public.reviews 
SET is_active = true 
WHERE id = 'review-uuid-here';

-- Get all pending reviews  
SELECT * FROM public.reviews 
WHERE is_active = false 
ORDER BY created_at DESC;
```

## Testing the Flow

### 1. Submit Test Review
1. Go to `/submit-review`
2. Fill out all 3 steps
3. Submit review
4. Check Make.com scenario runs
5. Verify data received correctly

### 2. Verify Database Entry
```sql
SELECT 
  user_email,
  rating,
  description,
  is_active,
  created_at
FROM public.reviews 
ORDER BY created_at DESC 
LIMIT 5;
```

### 3. Check Webhook Logs
- Make.com > Scenario > Execution History
- Look for successful runs with correct data
- Debug any failed executions

## Security Notes
- Only authenticated webhooks (password: shahzrp11) are processed
- Reviews default to pending (is_active: false) for moderation
- Media files uploaded to secure R2 storage
- Only cgdora4@gmail.com can access admin dashboard

## Common Troubleshooting
- **Webhook not firing**: Check Make.com URL and scenario is active
- **Missing data**: Verify JSON structure matches expected format  
- **Review not pending**: Check is_active field is false by default
- **Media not loading**: Verify R2 upload service is working