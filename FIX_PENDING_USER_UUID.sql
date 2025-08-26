-- Fix the pending user record with null merchant_id_uuid
UPDATE public.pending_users 
SET merchant_id_uuid = '78d3d151-51af-41d9-8d86-3a34c5d79532'::uuid
WHERE id = '67490a86-e135-4c07-8979-a7cb55cdadd2' AND merchant_id_uuid IS NULL;

-- Verify the fix
SELECT id, email, merchant_id, merchant_id_uuid, status, approval_status, accepted_at
FROM public.pending_users 
WHERE id = '67490a86-e135-4c07-8979-a7cb55cdadd2';
