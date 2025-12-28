-- Add workspace images storage support
-- This migration creates Storage bucket for workspace images

-- Create Storage bucket for workspace images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-images',
  'workspace-images',
  true, -- публичный доступ для чтения
  5242880, -- 5MB лимит (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for workspace-images
DROP POLICY IF EXISTS "Users can upload workspace images" ON storage.objects;
CREATE POLICY "Users can upload workspace images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workspace-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update workspace images" ON storage.objects;
CREATE POLICY "Users can update workspace images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'workspace-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete workspace images" ON storage.objects;
CREATE POLICY "Users can delete workspace images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'workspace-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Anyone can view workspace images" ON storage.objects;
CREATE POLICY "Anyone can view workspace images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'workspace-images');

