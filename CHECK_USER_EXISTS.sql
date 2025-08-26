-- Check if user exists in auth.users
SELECT id, email, created_at, email_confirmed_at, confirmed_at
FROM auth.users 
WHERE email = 'tamura.ryotaro@gmail.com';

-- Check if user exists in public.users table
SELECT user_id, auth_user_id, email, name, role, status, approved
FROM public.users 
WHERE email = 'tamura.ryotaro@gmail.com';

-- Check pending users status
SELECT id, email, name, status, approval_status, accepted_at
FROM public.pending_users 
WHERE email = 'tamura.ryotaro@gmail.com'
ORDER BY created_at DESC;
