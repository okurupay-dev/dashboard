-- Manually confirm the email for the auth user
UPDATE auth.users 
SET 
    email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'tamura.ryotaro@gmail.com' 
AND email_confirmed_at IS NULL;

-- Verify the update
SELECT 
    id, 
    email, 
    email_confirmed_at,
    confirmed_at,
    created_at
FROM auth.users 
WHERE email = 'tamura.ryotaro@gmail.com';
