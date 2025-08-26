-- Fix the latest pending_users record with null merchant_id_uuid
UPDATE public.pending_users 
SET merchant_id_uuid = '78d3d151-51af-41d9-8d86-3a34c5d79532'::uuid
WHERE id = 'fb5585d5-13f2-43c0-9c2c-ddfa76ba6820' AND merchant_id_uuid IS NULL;

-- Verify the fix
SELECT id, email, merchant_id, merchant_id_uuid, status, approval_status
FROM public.pending_users 
WHERE email = 'tamura.ryotaro@gmail.com'
ORDER BY created_at DESC;
