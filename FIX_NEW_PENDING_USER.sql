-- Fix the new pending_users record with null merchant_id_uuid
UPDATE public.pending_users 
SET merchant_id_uuid = '78d3d151-51af-41d9-8d86-3a34c5d79532'::uuid
WHERE id = '1ba027f5-f372-4e95-b7c2-8ad65f9eda4d' AND merchant_id_uuid IS NULL;

-- Verify the fix
SELECT id, email, merchant_id, merchant_id_uuid, status, approval_status
FROM public.pending_users 
WHERE email = 'tamura.ryotaro@gmail.com'
ORDER BY created_at DESC;
