-- Saved users (bookmarks)
-- Allows users to save profiles privately.

CREATE TABLE IF NOT EXISTS public.saved_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  saved_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saved_users_user_saved_unique UNIQUE (user_id, saved_user_id),
  CONSTRAINT saved_users_no_self_save CHECK (user_id <> saved_user_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_users_user_id ON public.saved_users(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_users_saved_user_id ON public.saved_users(saved_user_id);
CREATE INDEX IF NOT EXISTS idx_saved_users_created_at ON public.saved_users(created_at DESC);

ALTER TABLE public.saved_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved users" ON public.saved_users;
CREATE POLICY "Users can view own saved users"
  ON public.saved_users FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved users" ON public.saved_users;
CREATE POLICY "Users can insert own saved users"
  ON public.saved_users FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved users" ON public.saved_users;
CREATE POLICY "Users can delete own saved users"
  ON public.saved_users FOR DELETE
  USING (auth.uid() = user_id);

