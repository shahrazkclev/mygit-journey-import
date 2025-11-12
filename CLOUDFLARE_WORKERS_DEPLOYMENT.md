# Cloudflare Workers Email Campaign System - Deployment Guide

## Overview

This system replaces the unreliable Supabase Edge Functions with robust Cloudflare Workers for email campaign management and automation.

## Architecture

### Two Cloudflare Workers

1. **email-campaign** - Handles manual email campaigns with queue-based processing
2. **automation-engine** - Handles automated campaigns with cron-based scheduling

## Deployment Steps

### 1. Deploy Email Campaign Worker

```bash
cd cloudflare-workers/email-campaign
npx wrangler login
npx wrangler deploy
```

**Set Environment Variables:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `QUEUE_NAME` - Name of the Cloudflare Queue (e.g., "email-send-queue")

**Create Queue:**
```bash
npx wrangler queues create email-send-queue
```

### 2. Deploy Automation Engine Worker

```bash
cd cloudflare-workers/automation-engine
npx wrangler login
npx wrangler deploy
```

**Set Environment Variables:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `DEFAULT_WEBHOOK_URL` - (Optional) Default webhook URL for Make.com

**Note:** The automation engine runs on a cron schedule (every hour) to process scheduled actions.

### 3. Update Frontend Environment Variables

Add to your `.env` file or Vite config:

```env
VITE_CLOUDFLARE_WORKER_URL=https://email-campaign.your-subdomain.workers.dev
VITE_AUTOMATION_WORKER_URL=https://automation-engine.your-subdomain.workers.dev
```

### 4. Run Database Migrations

Apply the new migrations to your Supabase database:

```bash
supabase migration up
```

Or apply manually via Supabase dashboard:
- `20250128000001_create_email_templates.sql`
- `20250128000002_create_automation_rules.sql`
- `20250128000003_create_automation_actions.sql`
- `20250128000004_create_automation_logs.sql`
- `20250128000005_add_trigger_for_tag_changes.sql`

## Features

### Manual Campaigns
- Reliable queue-based email sending
- Automatic retries with exponential backoff
- Pause/resume functionality
- Real-time progress tracking

### Automation Campaigns
- Tag-based triggers (when tags are added/removed)
- Time-based delays (wait X days)
- Conditional logic (has tag X, doesn't have tag Y)
- Email template support with dynamic placeholders
- Auto-pilot mode - runs continuously

### Email Templates
- Reusable HTML templates
- Dynamic placeholders: `{{name}}`, `{{email}}`, `{{contact_id}}`, etc.
- Template categories
- Live preview

## Usage

### Creating an Automation Rule

1. Go to the "Automation" tab
2. Click "Create Automation"
3. Set trigger (e.g., "Tag Added: asked_for_discount")
4. Add conditions (e.g., "Wait 3 days", "Tag does not exist: product_purchased")
5. Configure action (select template or enter custom HTML, set webhook URL)
6. Save

### Triggering Automation

Automations are triggered automatically when:
- Tags are added/removed from contacts (via frontend)
- The cron job runs (every hour) to check scheduled actions

To manually trigger (for testing):
```typescript
import { automationApi } from '@/lib/automation-api';

await automationApi.triggerAutomation(contactId, 'tag_added', { tag: 'asked_for_discount' });
```

## Monitoring

- Check Cloudflare Workers dashboard for execution logs
- View automation logs in Supabase `automation_logs` table
- Monitor campaign progress in `campaigns` and `campaign_sends` tables

## Troubleshooting

### Campaigns not sending
- Check Cloudflare Worker logs
- Verify queue is configured correctly
- Check webhook URL is valid
- Ensure Supabase credentials are correct

### Automations not triggering
- Verify automation rule is enabled
- Check cron job is running (every hour)
- Review `automation_actions` table for scheduled actions
- Check `automation_logs` for error messages

## Migration from Old System

1. Deploy new Cloudflare Workers
2. Update frontend to use new API endpoints
3. Test with a small campaign
4. Once confirmed working, remove old Supabase Edge Functions:
   - `supabase/functions/send-campaign`
   - `supabase/functions/resume-campaign`

## Notes

- The system uses Cloudflare Queues for reliable message delivery
- Automation engine runs on cron schedule (configurable in wrangler.toml)
- All emails are sent via Make.com webhook
- Template placeholders are automatically replaced with contact data

