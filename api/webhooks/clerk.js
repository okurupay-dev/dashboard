/**
 * Vercel Serverless Function: Clerk Webhook Handler
 * 
 * Automatically syncs users to Supabase database when they:
 * - Accept invitations and get metadata set
 * - Update their profile/metadata
 * 
 * This eliminates the need for manual metadata setting and client-side auto-sync.
 * 
 * Webhook URL: https://your-domain.vercel.app/api/webhooks/clerk
 */

const { Webhook } = require('svix');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for server-side operations
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook signature
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const svix_id = req.headers['svix-id'];
  const svix_timestamp = req.headers['svix-timestamp'];
  const svix_signature = req.headers['svix-signature'];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  const body = JSON.stringify(req.body);
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  console.log('📨 Clerk webhook received:', evt.type);

  try {
    switch (evt.type) {
      case 'user.created':
        await handleUserCreated(evt);
        break;
      case 'user.updated':
        await handleUserUpdated(evt);
        break;
      default:
        console.log(`Unhandled webhook type: ${evt.type}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleUserCreated(evt) {
  console.log('👤 New user created:', evt.data.id);
  
  const publicMetadata = evt.data.public_metadata || {};
  
  if (publicMetadata.merchantId && publicMetadata.approved) {
    console.log('✅ User has complete metadata, syncing to database...');
    await syncUserToDatabase(evt);
  } else {
    console.log('⏳ User created but missing metadata, will sync when updated');
  }
}

async function handleUserUpdated(evt) {
  console.log('🔄 User updated:', evt.data.id);
  
  const publicMetadata = evt.data.public_metadata || {};
  
  // Check if user now has complete metadata
  if (publicMetadata.merchantId && publicMetadata.approved) {
    console.log('✅ User metadata complete, syncing to database...');
    await syncUserToDatabase(evt);
  } else {
    console.log('⏳ User updated but still missing required metadata');
  }
}

async function syncUserToDatabase(evt) {
  try {
    const publicMetadata = evt.data.public_metadata || {};
    const privateMetadata = evt.data.private_metadata || {};
    
    const { role, approved, businessName, merchantId } = publicMetadata;
    const { subscriptionTier = 'starter', kycStatus = 'pending' } = privateMetadata;

    if (!merchantId || !role || !approved) {
      throw new Error('Missing required metadata for sync');
    }

    // Get user's primary email
    const primaryEmail = evt.data.email_addresses?.find(email => email.id === evt.data.primary_email_address_id);
    const email = primaryEmail?.email_address || evt.data.email_addresses?.[0]?.email_address;

    if (!email) {
      throw new Error('No email address found for user');
    }

    console.log('🔄 Syncing user to database:', {
      clerkUserId: evt.data.id,
      email,
      merchantId,
      role,
      businessName
    });

    // Check if merchant exists, create if not
    const { data: existingMerchant } = await supabase
      .from('merchants')
      .select('merchant_id')
      .eq('merchant_id', merchantId)
      .single();

    if (!existingMerchant) {
      console.log('📝 Creating new merchant record');
      const { error: merchantError } = await supabase
        .from('merchants')
        .insert({
          merchant_id: merchantId,
          name: businessName || 'New Merchant',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (merchantError) {
        console.error('Error creating merchant:', merchantError);
        throw merchantError;
      }
    }

    // Check if user exists, create or update
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id')
      .eq('clerk_user_id', evt.data.id)
      .single();

    if (existingUser) {
      console.log('🔄 Updating existing user record');
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: evt.data.first_name && evt.data.last_name 
            ? `${evt.data.first_name} ${evt.data.last_name}` 
            : email.split('@')[0],
          email,
          role,
          approved,
          updated_at: new Date().toISOString()
        })
        .eq('clerk_user_id', evt.data.id);

      if (updateError) {
        console.error('Error updating user:', updateError);
        throw updateError;
      }
    } else {
      console.log('📝 Creating new user record');
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          clerk_user_id: evt.data.id,
          merchant_id: merchantId,
          name: evt.data.first_name && evt.data.last_name 
            ? `${evt.data.first_name} ${evt.data.last_name}` 
            : email.split('@')[0],
          email,
          role,
          approved,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error creating user:', insertError);
        throw insertError;
      }
    }

    console.log('🎉 User successfully synced to database via webhook');
  } catch (error) {
    console.error('❌ Failed to sync user to database:', error);
    throw error;
  }
}
