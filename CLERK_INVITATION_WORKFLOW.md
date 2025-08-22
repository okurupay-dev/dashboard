# 🔐 Clerk Invitation & Database Sync Workflow

## Overview
Due to Clerk's limitation where metadata cannot be set during invitation, we've implemented a two-step process:
1. Send invitation → User accepts → Set metadata → User logs in → Auto-sync to database

## 📋 Step-by-Step Process

### Step 1: Send Basic Invitation
```bash
# Via Clerk Dashboard (https://dashboard.clerk.com)
1. Go to Users → Invite User
2. Enter email address only
3. Send invitation
```

### Step 2: User Accepts Invitation
- User receives email and clicks invitation link
- User creates password and completes signup
- User account is now created in Clerk (but has no metadata yet)

### Step 3: Set User Metadata (Admin Task)
```bash
# Option A: Using the admin script
node scripts/set-user-metadata.js user@email.com merchant-uuid admin "Business Name"

# Option B: Via Clerk Dashboard
1. Go to Users → Find the user
2. Edit user → Metadata tab
3. Set Public Metadata:
   {
     "role": "admin",
     "approved": true,
     "businessName": "Coffee Shop Inc",
     "merchantId": "550e8400-e29b-41d4-a716-446655440000"
   }
4. Set Private Metadata:
   {
     "subscriptionTier": "starter",
     "kycStatus": "pending"
   }
```

### Step 4: User First Login & Auto-Sync
- User logs into dashboard for the first time
- `useAutoUserSync()` hook automatically triggers
- Creates merchant and user records in Supabase database
- Dashboard shows real data from database

## 🔧 Environment Setup

### Required Environment Variables
```bash
# .env file
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...  # For admin script only
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
REACT_APP_WEB3AUTH_CLIENT_ID=your-web3auth-client-id
```

### Install Admin Script Dependencies
```bash
npm install @clerk/clerk-sdk-node
```

## 🚀 Quick Start Example

### 1. Generate Merchant ID
```javascript
// Use this to generate unique merchant IDs
const merchantId = crypto.randomUUID();
console.log(merchantId); // e.g., "550e8400-e29b-41d4-a716-446655440000"
```

### 2. Send Invitation
- Email: `john@coffeeshop.com`
- (No metadata can be set at this stage)

### 3. After User Accepts, Set Metadata
```bash
node scripts/set-user-metadata.js \
  john@coffeeshop.com \
  550e8400-e29b-41d4-a716-446655440000 \
  admin \
  "Coffee Shop Inc"
```

### 4. User Logs In
- User visits dashboard
- Auto-sync creates database records
- Dashboard shows personalized data

## 🔍 Debugging & Monitoring

### Check Auto-Sync Status
```javascript
// Browser console will show:
"Auto-syncing user to database..."
"User successfully synced to database"
// OR
"User already exists in database"
```

### Verify Database Records
```sql
-- Check if merchant was created
SELECT * FROM merchants WHERE merchant_id = 'your-merchant-uuid';

-- Check if user was created
SELECT * FROM users WHERE clerk_user_id = 'user_xyz123';
```

## 🛠️ Troubleshooting

### Database Still Empty?
1. Check browser console for sync errors
2. Verify environment variables are set
3. Ensure user has `approved: true` in metadata
4. Check Supabase connection and RLS policies

### User Can't Access Dashboard?
1. Verify `approved: true` in public metadata
2. Check `role` is set correctly
3. Ensure `merchantId` exists in private metadata

### Sync Errors?
1. Check Supabase URL and anon key
2. Verify RLS policies allow inserts
3. Check network connectivity to Supabase

## 📊 Metadata Structure Reference

### Public Metadata (Client-Accessible)
```json
{
  "role": "admin|merchant|staff",
  "approved": true,
  "businessName": "Your Business Name",
  "merchantId": "uuid-v4-string"
}
```

### Private Metadata (Server-Only)
```json
{
  "subscriptionTier": "starter|pro|enterprise",
  "kycStatus": "pending|approved|rejected"
}
```

**Note:** `merchantId` is now in `publicMetadata` because `privateMetadata` is not accessible client-side in React apps without server middleware.

This workflow ensures secure, multi-tenant data isolation while working within Clerk's invitation system limitations.
