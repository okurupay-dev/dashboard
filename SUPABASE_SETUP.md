# OkuruDash Supabase Setup Guide

## 🔐 Secure Database Integration

This guide will help you set up Supabase with proper security for your OkuruDash crypto payment dashboard.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a secure password for your database
3. Wait for the project to be provisioned

## 2. Run Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `src/lib/database/supabase-schema.sql`
4. Click **Run** to create all tables, indexes, and security policies

## 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase credentials:

```bash
# Get these from your Supabase project settings
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Your existing Clerk key
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key

# Your Web3Auth client ID
REACT_APP_WEB3AUTH_CLIENT_ID=your_web3auth_client_id
```

## 4. Security Features Implemented

### Row Level Security (RLS)
- ✅ **Multi-tenant isolation** - Users can only access their merchant's data
- ✅ **Role-based permissions** - Admins have full access, staff has limited access
- ✅ **Automatic filtering** - All queries are automatically filtered by merchant_id

### Data Protection
- ✅ **Encrypted PINs** - Staff PINs are hashed before storage
- ✅ **Audit trails** - All changes are timestamped and tracked
- ✅ **Secure wallet storage** - Private keys never stored, only addresses and signatures

### API Security
- ✅ **Authentication required** - All operations require valid Clerk session
- ✅ **Permission validation** - Role and merchant checks on every request
- ✅ **Error handling** - Secure error messages that don't leak sensitive data

## 5. Database Tables Created

### Core Tables
- **merchants** - Business information and settings
- **users** - Staff members linked to Clerk authentication
- **locations** - Physical business locations
- **terminals** - POS terminals and their status

### Wallet Tables
- **merchant_wallets** - One wallet per merchant (Web3Auth integration)
- **wallet_addresses** - Per-chain addresses with verification status

### Transaction Tables
- **transactions** - All payment transactions with full audit trail
- **automations** - Automated conversion rules
- **automation_executions** - Execution history and results

## 6. Real-time Features

Supabase provides real-time subscriptions for:
- **Live transaction updates** - See payments as they happen
- **Terminal status monitoring** - Real-time online/offline status
- **Automation triggers** - Instant notifications when rules execute

## 7. Next Steps

1. **Set up environment variables** as described above
2. **Test the connection** by running the app locally
3. **Create your first merchant** through the admin interface
4. **Set up Web3Auth** for wallet creation
5. **Configure automation rules** for crypto conversions

## 8. Production Deployment

For production:
1. **Use production Supabase project** with proper backup policies
2. **Set up database monitoring** and alerts
3. **Configure rate limiting** on sensitive endpoints
4. **Enable audit logging** for compliance
5. **Set up automated backups** for disaster recovery

## 9. Security Checklist

- [ ] RLS policies enabled on all tables
- [ ] Environment variables secured
- [ ] Database backups configured
- [ ] Monitoring and alerts set up
- [ ] Rate limiting implemented
- [ ] Audit logging enabled
- [ ] SSL/TLS enforced
- [ ] API keys rotated regularly

## 10. Troubleshooting

### Common Issues
- **RLS blocking queries** - Check user context and merchant_id
- **Permission denied** - Verify user role and authentication
- **Connection errors** - Check environment variables and network

### Debug Tools
- Use Supabase dashboard to monitor queries
- Check browser console for authentication errors
- Review RLS policies if data access fails

Your OkuruDash dashboard is now ready for secure, production-grade database operations!
