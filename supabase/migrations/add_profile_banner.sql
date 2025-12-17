-- Add profile banner support
-- This migration creates a Storage bucket for profile banners and adds banner_url field to profiles table

-- 1. Add banner_url column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 2. Create Storage bucket for profile banners
-- Note: This requires the storage extension to be enabled
-- If bucket already exists, this will be ignored
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-banners',
  'profile-banners',
  true, -- публичный доступ для чтения
  5242880, -- 5MB лимит (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Enable RLS on storage.objects (if not already enabled)
-- Note: RLS is usually enabled by default on storage.objects

-- 4. RLS политика: пользователи могут загружать только свои баннеры
-- Файлы должны быть в папке с их user_id
DROP POLICY IF EXISTS "Users can upload their own banner" ON storage.objects;
CREATE POLICY "Users can upload their own banner"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-banners' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. RLS политика: пользователи могут обновлять только свои баннеры
DROP POLICY IF EXISTS "Users can update their own banner" ON storage.objects;
CREATE POLICY "Users can update their own banner"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-banners' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. RLS политика: пользователи могут удалять только свои баннеры
DROP POLICY IF EXISTS "Users can delete their own banner" ON storage.objects;
CREATE POLICY "Users can delete their own banner"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-banners' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 7. RLS политика: все могут читать баннеры (публичный доступ)
DROP POLICY IF EXISTS "Anyone can view banners" ON storage.objects;
CREATE POLICY "Anyone can view banners"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-banners');

