# 🚀 Production Merchant Onboarding Guide

## Overview
This guide provides the exact steps to onboard new merchants to your OkuruDash platform using the automated Clerk webhook system.

## 📋 **Complete Onboarding Process**

### **Step 1: Send Clerk Invitation**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Users** → **Invite User**
3. Enter the merchant's **email address only**
4. Click **Send Invitation**
5. ✅ **Done** - No metadata needed at this stage

### **Step 2: User Accepts Invitation**
1. User receives invitation email
2. User clicks link and creates password
3. User account is created in Clerk
4. ✅ `user.created` webhook automatically triggers
5. ✅ **Done** - User account is ready for metadata

### **Step 3: Set Merchant Metadata**
1. Go to Clerk Dashboard → **Users**
2. Find the newly created user
3. Click **Edit User** → **Metadata** tab
4. Set **Public Metadata**:
   ```json
   {
     "role": "admin",
     "approved": true,
     "businessName": "Merchant Business Name",
     "merchantId": "generate-uuid-here"
   }
   ```
5. Set **Private Metadata**:
   ```json
   {
     "subscriptionTier": "starter",
     "kycStatus": "pending"
   }
   ```
6. Click **Save**
7. ✅ `user.updated` webhook triggers → **Database automatically populated**

### **Step 4: Verify Database Records**
Check your Supabase database to confirm records were created:

```sql
-- Check merchant record
SELECT * FROM merchants WHERE merchant_id = 'your-merchant-uuid';

-- Check user record
SELECT * FROM users WHERE clerk_user_id = 'user_xyz123';
```

### **Step 5: User Can Now Access Dashboard**
1. User logs into dashboard at `https://dashboard.okurupay.com`
2. Dashboard shows real data from database
3. ✅ **Onboarding Complete**

---

## 🔧 **Merchant ID Generation**

### **Generate UUID for Each Merchant:**
```bash
# Option 1: Command line
node -e "console.log(require('crypto').randomUUID())"

# Option 2: Online generator
# Visit: https://www.uuidgenerator.net/
```

### **Example UUIDs:**
- `550e8400-e29b-41d4-a716-446655440000`
- `6ba7b810-9dad-11d1-80b4-00c04fd430c8`
- `6ba7b811-9dad-11d1-80b4-00c04fd430c8`

---

## 📊 **Monitoring & Troubleshooting**

### **Check Webhook Status:**
1. Clerk Dashboard → **Webhooks** → Your endpoint
2. View **Recent Deliveries**
3. Should see **Succeeded** status for both events

### **Webhook Events to Monitor:**
- ✅ `user.created` - When user accepts invitation
- ✅ `user.updated` - When metadata is set → Database sync

### **Common Issues:**

#### **Webhook Failing:**
- Check Vercel environment variables are set
- Verify `CLERK_WEBHOOK_SECRET` matches Clerk dashboard
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is correct

#### **Database Not Populating:**
- Verify user has complete metadata (all required fields)
- Check Supabase RLS policies allow inserts
- Review Vercel function logs for errors

#### **User Can't Access Dashboard:**
- Ensure `approved: true` in public metadata
- Verify `merchantId` is set correctly
- Check user role is valid (`admin`, `merchant`, `staff`)

---

## 🎯 **Quick Reference Checklist**

### **For Each New Merchant:**
- [ ] Send Clerk invitation (email only)
- [ ] User accepts invitation
- [ ] Generate unique merchant UUID
- [ ] Set public metadata with role, approved, businessName, merchantId
- [ ] Set private metadata with subscriptionTier, kycStatus
- [ ] Verify webhook succeeded in Clerk dashboard
- [ ] Confirm database records created in Supabase
- [ ] Test user login to dashboard

### **Required Environment Variables:**
- [ ] `CLERK_WEBHOOK_SECRET` - From Clerk webhook endpoint
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - From Supabase API settings
- [ ] `REACT_APP_SUPABASE_URL` - Your Supabase project URL
- [ ] `REACT_APP_SUPABASE_ANON_KEY` - Supabase anon key

---

## 🔗 **Important URLs**

- **Clerk Dashboard**: https://dashboard.clerk.com
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Your Dashboard**: https://dashboard.okurupay.com
- **Webhook Endpoint**: https://dashboard.okurupay.com/api/webhooks/clerk

---

## 📈 **Scaling Considerations**

### **Bulk Onboarding:**
- Send multiple invitations simultaneously
- Prepare metadata templates for different merchant types
- Monitor webhook delivery rates during high volume

### **Automation Opportunities:**
- Create admin interface for invitation management
- Implement bulk metadata setting
- Add email templates for different merchant segments
- Set up monitoring alerts for failed webhooks

---

## 🎉 **Success Metrics**

A successful onboarding should result in:
- ✅ User account created in Clerk
- ✅ Merchant record in `merchants` table
- ✅ User record in `users` table with correct `merchant_id`
- ✅ User can log in and see dashboard
- ✅ All webhook deliveries show "Succeeded" status

**The entire process from invitation to dashboard access should take less than 5 minutes per merchant.**
