-- Check the auth user status and email confirmation
SELECT 
    id, 
    email, 
    email_confirmed_at,
    confirmed_at,
    created_at,
    last_sign_in_at,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'tamura.ryotaro@gmail.com';

-- Check if there's a corresponding record in public.users
SELECT 
    user_id, 
    auth_user_id, 
    email, 
    name, 
    role, 
    status, 
    approved
FROM public.users 
WHERE email = 'tamura.ryotaro@gmail.com';
