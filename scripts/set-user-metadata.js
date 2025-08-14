/**
 * Admin Script: Set User Metadata After Invitation Acceptance
 * 
 * This script helps you set metadata for users after they accept Clerk invitations.
 * Run this script after a user accepts an invitation but before they log in for the first time.
 * 
 * Usage:
 * node scripts/set-user-metadata.js <user-email> <merchant-id> <role> <business-name>
 * 
 * Example:
 * node scripts/set-user-metadata.js john@coffeeshop.com 550e8400-e29b-41d4-a716-446655440000 admin "Coffee Shop Inc"
 */

const { Clerk } = require('@clerk/clerk-sdk-node');

// Initialize Clerk with your secret key
const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

async function setUserMetadata() {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.error('Usage: node set-user-metadata.js <email> <merchant-id> <role> <business-name>');
    console.error('Example: node set-user-metadata.js john@coffee.com uuid-123 admin "Coffee Shop"');
    process.exit(1);
  }

  const [email, merchantId, role, businessName] = args;

  try {
    console.log(`Setting metadata for user: ${email}`);
    
    // Find user by email
    const users = await clerk.users.getUserList({ emailAddress: [email] });
    
    if (users.length === 0) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    const user = users[0];
    console.log(`Found user: ${user.id}`);

    // Set public metadata (visible to client)
    const publicMetadata = {
      role: role,
      approved: true,
      businessName: businessName
    };

    // Set private metadata (server-only)
    const privateMetadata = {
      merchantId: merchantId,
      subscriptionTier: 'starter',
      kycStatus: 'pending'
    };

    // Update user metadata
    await clerk.users.updateUser(user.id, {
      publicMetadata,
      privateMetadata
    });

    console.log('✅ User metadata updated successfully!');
    console.log('Public metadata:', publicMetadata);
    console.log('Private metadata:', privateMetadata);
    console.log('\nUser can now log in and will be automatically synced to database.');

  } catch (error) {
    console.error('❌ Error setting user metadata:', error);
    process.exit(1);
  }
}

// Check for required environment variables
if (!process.env.CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY environment variable is required');
  console.error('Set it in your .env file or export it before running this script');
  process.exit(1);
}

setUserMetadata();
