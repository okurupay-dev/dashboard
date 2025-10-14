# Supabase Storage Setup for Product Images

## Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **Storage** in the left sidebar
4. Click **New Bucket**
5. Enter bucket name: `product-images`
6. Set as **Public bucket** ✅ (so images can be viewed on storefronts)
7. Click **Create Bucket**

## Step 2: Set Bucket Policies (Important!)

After creating the bucket, set these policies:

### Policy 1: Allow Public Read Access
```sql
-- Allow anyone to view product images
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');
```

### Policy 2: Allow Authenticated Users to Upload
```sql
-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');
```

### Policy 3: Allow Users to Update Their Own Images
```sql
-- Allow users to update their own merchant's images
CREATE POLICY "Users can update their merchant images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### Policy 4: Allow Users to Delete Their Own Images
```sql
-- Allow users to delete their own merchant's images
CREATE POLICY "Users can delete their merchant images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
```

## Step 3: Configure File Size Limits (Optional)

In Supabase Dashboard:
1. Go to **Storage** → **product-images** bucket
2. Click **Settings**
3. Set **Max file size**: 5 MB (or your preference)
4. Allowed MIME types: `image/jpeg, image/png, image/webp, image/gif`

## Step 4: Test Upload

Try uploading a product image from the dashboard. The URL should look like:
```
https://[your-project].supabase.co/storage/v1/object/public/product-images/[merchant-id]/[timestamp].jpg
```

## Troubleshooting

### Error: "Bucket not found"
- Make sure the bucket is named exactly `product-images`
- Check that the bucket exists in Storage dashboard

### Error: "Permission denied"
- Verify the storage policies are set correctly
- Make sure user is authenticated
- Check that RLS is enabled on storage.objects

### Images not loading
- Ensure bucket is set to **Public**
- Check the public URL format is correct
- Verify CORS settings allow your domain
