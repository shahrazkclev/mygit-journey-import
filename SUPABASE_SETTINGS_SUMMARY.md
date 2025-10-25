# Supabase Project Settings Summary
**Generated on:** January 2025  
**Project:** emails (mixifcnokcmxarpzwfiy)

## 🔧 Project Configuration

### Basic Info
- **Project ID:** `mixifcnokcmxarpzwfiy`
- **Project Name:** emails
- **Organization ID:** `gzqrplvtxelvdymxgrbt`
- **Region:** eu-north-1
- **Status:** ACTIVE_HEALTHY
- **Created:** 2025-07-25T17:54:11.976632Z

### Database Details
- **Host:** `db.mixifcnokcmxarpzwfiy.supabase.co`
- **PostgreSQL Version:** 17.4.1.064
- **Engine:** PostgreSQL 17
- **Release Channel:** ga

### API Keys
- **Anonymous Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peGlmY25va2NteGFycHp3Zml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NjYwNTEsImV4cCI6MjA2OTA0MjA1MX0.-4uIuzcHcDGS20-dtKbjVFOtpBSmwYhT9Bgt6KA-dXI`

## 📊 Database Schema Overview

### Tables (18 total)
| Table Name | Rows | RLS Enabled | Primary Purpose |
|------------|------|-------------|-----------------|
| campaigns | 21 | ✅ | Email campaign management |
| campaign_sends | 844 | ✅ | Individual email send tracking |
| contact_lists | 1,499 | ✅ | Contact-list relationships |
| contacts | 1,696 | ✅ | Contact information |
| contact_products | 0 | ✅ | Contact product purchases |
| deals | 1 | ✅ | Deal/promotion management |
| email_lists | 7 | ✅ | Email list definitions |
| product_links | 38 | ✅ | Product download/video links |
| products | 38 | ✅ | Product catalog |
| profiles | 1 | ✅ | User profiles |
| promotions | 5 | ✅ | Promotion campaigns |
| reviews | 11 | ✅ | Customer reviews |
| style_guides | 2 | ✅ | Brand styling |
| support_submissions | 5 | ✅ | Support tickets |
| tag_rules | 9 | ✅ | Automated tag management |
| unsubscribe_tokens | 0 | ✅ | Unsubscribe token management |
| unsubscribed_contacts | 0 | ✅ | Unsubscribed contact archive |
| unsubscribes | 2 | ✅ | Unsubscribe tracking |
| verification_tokens | 0 | ✅ | Email verification |

## 📈 Data Statistics

### Contact Management
- **Total Contacts:** 1,696
- **Subscribed:** 1,696 (100%)
- **Unsubscribed:** 0 (0%)
- **Bounced:** 0 (0%)

### Campaign Performance
- **Total Campaigns:** 21
- **Sent Campaigns:** 21 (100%)
- **Draft Campaigns:** 0 (0%)
- **Currently Sending:** 0 (0%)

### Product Assets
- **Total Product Links:** 38
- **With Download URLs:** 37 (97.4%)
- **With Video Guides:** 32 (84.2%)
- **Complete (Both):** 32 (84.2%)

## 🎯 Product Links Status

### Fully Configured (32 assets)
✅ 360 loop asset  
✅ animated array asset  
✅ auto animate - asset  
✅ bubbles on path asset  
✅ cloth on path  
✅ cloth printing asset  
✅ easy grid asset  
✅ gear platform  
✅ good shapekeys asset  
✅ h2o droplet simulation  
✅ ice off  
✅ knitting effect  
✅ levitate  
✅ meshgen  
✅ motion domain  
✅ motion line asset  
✅ pack of 5 hand-made motions  
✅ pop up pro  
✅ projector  
✅ ripples  
✅ roll on path asset  
✅ shift line a & b  
✅ slideshow a  
✅ slideshow b  
✅ soft balls asset  
✅ sprikles  
✅ the sprayer  
✅ the tornado  
✅ things on path asset  
✅ unfold  
✅ water on path asset  
✅ wheel  

### Missing Video Guides (6 assets)
⚠️ jump & roll asset  
⚠️ scale & slide motion asset  
⚠️ swirls  
⚠️ textify: callouts & titles animation  
⚠️ the lazy motion library  

### Missing Download Links (1 asset)
❌ cleverpoly all in one discounted bundle  

## 🚀 Edge Functions (9 active)

| Function | Status | Version | JWT Required |
|----------|--------|---------|--------------|
| generate-email | ACTIVE | 233 | ✅ |
| edit-email | ACTIVE | 107 | ✅ |
| unsubscribe | ACTIVE | 137 | ✅ |
| send-campaign | ACTIVE | 186 | ✅ |
| sync-contacts | ACTIVE | 173 | ✅ |
| sync-unsubscribes | ACTIVE | 67 | ❌ |
| compress-video | ACTIVE | 22 | ✅ |
| resume-campaign | ACTIVE | 7 | ✅ |
| get-user-products | ACTIVE | 2 | ✅ |

## 📝 Database Migrations

**Total Migrations:** 71  
**Latest Migration:** 20251012121804  
**Migration History:** From 2025-07-25 to 2025-10-12

### Key Migration Categories
- Initial schema setup (July 2025)
- Email campaign functionality (August 2025)
- Review system implementation (September 2025)
- Product links and deals (October 2025)
- Tag normalization and RLS policies (September-October 2025)

## 🔒 Security & Access

### Row Level Security (RLS)
- **All tables have RLS enabled**
- **User-based access control implemented**
- **Protected tag validation system**

### Authentication
- **JWT verification enabled on most functions**
- **Anonymous access for sync-unsubscribes only**
- **User profile management system**

## 🎨 Brand Configuration

### Style Guides (2 configured)
- **Default brand colors:** #684cff (primary), #22d3ee (secondary), #34d399 (accent)
- **Font family:** Segoe UI, sans-serif
- **Tone:** friendly
- **Email signature:** "Best regards, The Team"

## 📧 Email System Features

### Campaign Management
- **Batch sending with configurable delays**
- **Retry mechanism for failed sends**
- **Campaign status tracking**
- **Webhook integration support**

### Contact Management
- **Tag-based segmentation**
- **List-based organization**
- **Unsubscribe handling**
- **Bounce management**

## 🔧 System Settings

### User Settings (1 configured)
- **Sending speed:** 50 emails/hour
- **Batch size:** 10 emails
- **Delay between batches:** 5 seconds
- **Delay between emails:** 2 seconds
- **Retries enabled:** Yes (max 3)
- **Webhook URL:** Configured

## 📊 Performance Indexes
- **Optimized for contact queries**
- **Campaign performance tracking**
- **Tag-based filtering**

## 🎯 Key Features Implemented

1. **Email Marketing Platform**
   - Campaign creation and management
   - Contact segmentation
   - Automated sending with rate limiting

2. **Product Asset Management**
   - Download link management
   - Video tutorial integration
   - Tag-based organization

3. **Review System**
   - Customer review collection
   - Media optimization
   - Tag-based categorization

4. **Support System**
   - Ticket management
   - Screenshot support
   - Status tracking

5. **Deal Management**
   - Promotion campaigns
   - Discount tracking
   - Expiration management

## 🔄 Backup Recommendations

### Critical Data to Backup
1. **Contact database** (1,696 records)
2. **Campaign history** (21 campaigns, 844 sends)
3. **Product links configuration** (38 assets)
4. **User settings and style guides**
5. **Database schema and migrations**

### Restoration Process
1. Restore database schema using migrations
2. Import contact data
3. Restore product links and configurations
4. Verify RLS policies
5. Test edge functions

---

**Last Updated:** January 2025  
**Backup Status:** ✅ Complete  
**Health Status:** 🟢 ACTIVE_HEALTHY


