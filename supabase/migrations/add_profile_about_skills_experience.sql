-- Long-form About (separate from short bio used elsewhere)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS about TEXT;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_about_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_about_check CHECK (about IS NULL OR char_length(about) <= 4000);

-- Optional backfill: copy existing short bio into about when about is empty
UPDATE public.profiles
SET about = bio
WHERE about IS NULL
  AND bio IS NOT NULL
  AND length(trim(bio)) > 0;

-- Skills (ordered list per user)
CREATE TABLE IF NOT EXISTS public.profile_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 120 AND length(trim(name)) > 0),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_skills_user_id ON public.profile_skills(user_id);

-- Experience entries per user
CREATE TABLE IF NOT EXISTS public.profile_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 300),
  company TEXT CHECK (company IS NULL OR char_length(company) <= 200),
  start_date TEXT CHECK (start_date IS NULL OR char_length(start_date) <= 32),
  end_date TEXT CHECK (end_date IS NULL OR char_length(end_date) <= 32),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_experience_user_id ON public.profile_experience(user_id);

ALTER TABLE public.profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_experience ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profile skills are viewable by everyone"
  ON public.profile_skills FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile skills"
  ON public.profile_skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile skills"
  ON public.profile_skills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile skills"
  ON public.profile_skills FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Profile experience is viewable by everyone"
  ON public.profile_experience FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile experience"
  ON public.profile_experience FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile experience"
  ON public.profile_experience FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile experience"
  ON public.profile_experience FOR DELETE
  USING (auth.uid() = user_id);
