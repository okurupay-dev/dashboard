-- Check for existing users with the email in the users table
SELECT user_id, auth_user_id, email, name, status, created_at
FROM public.users 
WHERE email = 'tamur122@newschool.edu';

-- Check for existing users with the email in auth.users
SELECT id, email, created_at, email_confirmed_at
FROM auth.users 
WHERE email = 'tamur122@newschool.edu';

-- Check all pending users with this email
SELECT id, email, name, status, approval_status, created_at
FROM public.pending_users 
WHERE email = 'tamur122@newschool.edu'
ORDER BY created_at DESC;
