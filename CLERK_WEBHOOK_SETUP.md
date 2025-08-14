# 🔗 Clerk Webhook Setup Guide

## Overview
This guide sets up automatic database synchronization when users accept Clerk invitations. **No manual metadata setting required!**

## 🚀 **New Simplified Workflow:**
1. **Send invitation** → User accepts → **Database automatically populated** ✨
2. **Set metadata via Clerk Dashboard** → **Database automatically updates** ✨

## 📋 Setup Steps

### Step 1: Deploy Your App to Vercel
```bash
# Make sure your app is deployed to get the webhook URL
vercel --prod
# Your webhook URL will be: https://your-app.vercel.app/api/webhooks/clerk
```

### Step 2: Configure Clerk Webhook
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Webhooks** in the sidebar
3. Click **Add Endpoint**
4. Set **Endpoint URL**: `https://your-app.vercel.app/api/webhooks/clerk`
5. Select **Events**:
   - ✅ `user.created`
   - ✅ `user.updated`
6. Click **Create**
7. **Copy the Signing Secret** (starts with `whsec_...`)

### Step 3: Set Environment Variables
Add these to your Vercel environment variables and `.env`:

```bash
# Clerk Webhook
CLERK_WEBHOOK_SECRET=whsec_your_signing_secret_here

# Supabase Service Role Key (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Where to find Supabase Service Role Key:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (not the anon key!)

### Step 4: Test the Webhook

#### Option A: Send Invitation & Set Metadata
```bash
# 1. Send invitation via Clerk Dashboard (just email)
# 2. User accepts invitation
# 3. Set metadata via Clerk Dashboard:

Public Metadata:
{
  "role": "admin",
  "approved": true,
  "businessName": "Coffee Shop Inc",
  "merchantId": "550e8400-e29b-41d4-a716-446655440000"
}

Private Metadata:
{
  "subscriptionTier": "starter",
  "kycStatus": "pending"
}
```

#### Option B: Use Admin Script (Still Works)
```bash
node scripts/set-user-metadata.js \
  user@email.com \
  550e8400-e29b-41d4-a716-446655440000 \
  admin \
  "Coffee Shop Inc"
```

### Step 5: Verify Database Sync
Check your Supabase database - records should be automatically created:

```sql
-- Check merchants table
SELECT * FROM merchants;

-- Check users table  
SELECT * FROM users WHERE clerk_user_id = 'user_xyz123';
```

## 🔍 Debugging

### Check Webhook Logs
1. Go to Clerk Dashboard → Webhooks
2. Click on your webhook endpoint
3. View **Recent Deliveries** to see success/failure

### Check Vercel Function Logs
1. Go to Vercel Dashboard
2. Select your project
3. Go to **Functions** tab
4. Click on `/api/webhooks/clerk`
5. View logs for debugging

### Common Issues

#### Webhook Not Triggering
- ✅ Verify webhook URL is correct
- ✅ Check webhook events are selected (`user.created`, `user.updated`)
- ✅ Ensure app is deployed to Vercel

#### Database Not Updating
- ✅ Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- ✅ Verify Supabase RLS policies allow inserts
- ✅ Check Vercel function logs for errors

#### Signature Verification Failed
- ✅ Ensure `CLERK_WEBHOOK_SECRET` matches Clerk dashboard
- ✅ Check environment variables are deployed to Vercel

## 🎉 Benefits of Webhook Approach

### ✅ **Automatic**
- No manual metadata setting required
- Database syncs immediately when users accept invitations

### ✅ **Reliable**
- Server-side processing ensures consistency
- Webhook retries on failure

### ✅ **Secure**
- Uses Supabase service role key for secure database operations
- Webhook signature verification prevents unauthorized access

### ✅ **Real-time**
- Database updates happen instantly
- No client-side sync delays

## 📊 Webhook Event Flow

```
User accepts invitation
        ↓
Clerk sends webhook (user.created)
        ↓
Vercel function processes webhook
        ↓
Creates merchant record (if needed)
        ↓
Creates user record
        ↓
Database is ready!
        ↓
User logs in → Dashboard shows real data ✨
```

This approach eliminates the need for client-side auto-sync and manual metadata management!
