-- =============================================================================
-- OKURU PRODUCTION DATABASE SETUP
-- Complete setup script for OkuruDash platform
-- Run these files in order for a clean production deployment
-- =============================================================================

/*
PRODUCTION SETUP INSTRUCTIONS:

1. Run these SQL files in Supabase SQL Editor in EXACT ORDER:
   
   Step 1: supabase-schema.sql                    - Base tables and functions
   Step 2: terminal-auth-improvements.sql         - Terminal sessions & permissions  
   Step 3: complete-terminal-integration.sql      - Transaction processing & validation
   Step 4: terminal-crypto-config.sql            - 3-crypto terminal configuration
   Step 5: okuru-admin-database-safe.sql         - Business intelligence & analytics
   Step 6: okuru-fee-tracking.sql                - Revenue tracking & fee collection
   Step 7: clerk-supabase-jwt-fix-safe.sql       - Enhanced authentication
   Step 8: okuru-admin-control-policies-safe.sql - Final access control (MUST BE LAST)

2. CRITICAL: Run Step 8 LAST - it replaces all existing RLS policies

3. After setup, your database will have:
   ✅ Multi-tenant merchant isolation
   ✅ Terminal session management
   ✅ 3-crypto configuration per terminal
   ✅ Real-time transaction processing
   ✅ Complete business intelligence
   ✅ Revenue tracking and analytics
   ✅ Okuru admin control over everything
   ✅ Merchant operational control (limited)

4. Test the setup:
   - Create a test merchant account
   - Add terminals and configure 3 cryptocurrencies
   - Process test transactions
   - Verify analytics and fee tracking
   - Test admin vs merchant access levels
*/

-- =============================================================================
-- WHAT EACH FILE DOES
-- =============================================================================

/*
FILE 1: supabase-schema.sql (11.5 KB)
- Core tables: merchants, users, locations, terminals, transactions
- Basic wallet and automation tables
- Initial RLS policies and helper functions
- Foundation for the entire platform

FILE 2: terminal-auth-improvements.sql (7.6 KB)  
- Adds terminal_sessions table for login/logout tracking
- Adds terminal_permissions table for access control
- Session validation and management functions
- Required for secure terminal operations

FILE 3: complete-terminal-integration.sql (19.4 KB)
- Enhanced transaction processing with session validation
- Terminal transaction events logging
- Dashboard data integration functions
- Real-time transaction status updates
- Comprehensive audit trail from terminal to dashboard

FILE 4: terminal-crypto-config.sql (9.9 KB)
- terminal_crypto_config table (exactly 3 cryptos per terminal)
- Crypto validation and configuration functions
- Default crypto setups for existing terminals
- Amount validation for transactions

FILE 5: okuru-admin-database-safe.sql (23.9 KB)
- Company settings and configuration
- Merchant analytics (daily/weekly/monthly)
- Global platform analytics and insights
- Business alerts and monitoring system
- Executive dashboard functions

FILE 6: okuru-fee-tracking.sql (16.3 KB)
- Okuru fee collection tracking (1% processing fee)
- Revenue analytics and reporting
- Fee collection status monitoring
- Business intelligence for company revenue

FILE 7: clerk-supabase-jwt-fix-safe.sql (9.4 KB)
- Enhanced Clerk JWT integration
- Better user authentication functions
- Metadata access from Clerk
- Debugging functions for auth troubleshooting

FILE 8: okuru-admin-control-policies-safe.sql (24.5 KB) - FINAL STEP
- Replaces ALL existing RLS policies
- Gives Okuru admins full control over everything
- Restricts merchants to limited operational control
- Perfect SaaS platform access model
*/

-- =============================================================================
-- PRODUCTION FEATURES ENABLED
-- =============================================================================

/*
MERCHANT FEATURES:
✅ Staff management (add, update, remove staff)
✅ Terminal configuration (3 cryptocurrencies per terminal)
✅ Wallet management (add addresses for new blockchains)
✅ Automation creation and management
✅ Transaction viewing and analytics
✅ Real-time dashboard updates

OKURU ADMIN FEATURES:
✅ Complete merchant management
✅ All terminal configuration and troubleshooting
✅ Global platform analytics and business intelligence
✅ Revenue tracking and fee collection monitoring
✅ User account management across all merchants
✅ Company settings and configuration
✅ Business alerts and system monitoring

SYSTEM FEATURES:
✅ Multi-tenant data isolation
✅ Terminal session management
✅ Real-time transaction processing
✅ Comprehensive audit trails
✅ Automated fee collection
✅ Business intelligence and reporting
✅ Scalable architecture for growth
*/

-- =============================================================================
-- SECURITY MODEL
-- =============================================================================

/*
ACCESS CONTROL:
- Okuru admins: Full access to everything across all merchants
- Merchant admins: Limited to their merchant + staff/automation/terminal management
- Merchant staff: Read-only access to their merchant data
- Complete data isolation between merchants
- All access controlled by Row Level Security (RLS)

AUTHENTICATION:
- Clerk integration for user authentication
- JWT-based session management
- Metadata-driven role assignment
- Secure webhook onboarding

AUDIT TRAILS:
- All transactions tracked from terminal to dashboard
- User actions logged with timestamps
- Terminal session management
- Complete business intelligence
*/

-- =============================================================================
-- POST-SETUP VERIFICATION
-- =============================================================================

/*
After running all 8 files, verify your setup:

1. Check tables exist:
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' ORDER BY table_name;

2. Check RLS policies:
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
   FROM pg_policies ORDER BY tablename, policyname;

3. Test authentication functions:
   SELECT get_current_clerk_user_id();
   SELECT get_current_merchant_id();
   SELECT is_okuru_admin();

4. Check company settings:
   SELECT * FROM okuru_company_settings;

5. Verify terminal crypto config:
   SELECT * FROM terminal_crypto_config LIMIT 5;
*/

-- =============================================================================
-- MAINTENANCE NOTES
-- =============================================================================

/*
REGULAR MAINTENANCE:
- Run calculate_merchant_analytics() daily for each merchant
- Monitor okuru_alerts table for business alerts
- Check okuru_fee_collections for revenue tracking
- Review terminal_sessions for security monitoring

SCALING CONSIDERATIONS:
- Add indexes as transaction volume grows
- Consider partitioning large tables by date
- Monitor RLS policy performance
- Regular backup and disaster recovery testing

DEVELOPMENT WORKFLOW:
- Use separate Clerk apps for dev/staging/production
- Test RLS policies thoroughly before deployment
- Maintain separate admin console repository
- Regular security audits and penetration testing
*/
