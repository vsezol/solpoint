-- v1: role taxonomy refresh + interests dictionary + profile_interests M2M

DO $$
BEGIN
  -- Recreate user_role enum with the new set.
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_new') THEN
      CREATE TYPE public.user_role_new AS ENUM (
        'marketing_or_bd',
        'non_tech_founder',
        'tech_founder',
        'designer_ui_ux',
        'graphics_designer',
        'vc',
        'angel_investor',
        'artist',
        'influencer',
        'developer',
        'validator',
        'other'
      );
    END IF;

    -- Drop legacy default so role is explicitly selected by users.
    ALTER TABLE public.profiles
      ALTER COLUMN role DROP DEFAULT;

    -- Reset legacy role values to NULL before casting.
    UPDATE public.profiles
    SET role = NULL
    WHERE role::text IN ('degen', 'trader', 'investor', 'designer', 'founder');

    ALTER TABLE public.profiles
      ALTER COLUMN role TYPE public.user_role_new
      USING (
        CASE
          WHEN role IS NULL THEN NULL
          WHEN role::text IN (
            'marketing_or_bd',
            'non_tech_founder',
            'tech_founder',
            'designer_ui_ux',
            'graphics_designer',
            'vc',
            'angel_investor',
            'artist',
            'influencer',
            'developer',
            'validator',
            'other'
          ) THEN role::text::public.user_role_new
          ELSE NULL
        END
      );

    DROP TYPE public.user_role;
    ALTER TYPE public.user_role_new RENAME TO user_role;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9_]+$' AND char_length(slug) <= 64),
  name TEXT NOT NULL UNIQUE CHECK (char_length(name) <= 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profile_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest_id UUID NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profile_interests_user_interest_unique UNIQUE (user_id, interest_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_interests_user_id ON public.profile_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_interests_interest_id ON public.profile_interests(interest_id);

INSERT INTO public.interests (slug, name)
VALUES
  ('defi', 'DeFi'),
  ('art', 'Art'),
  ('infrastructure', 'Infrastructure'),
  ('digital_collectibles', 'Digital Collectibles'),
  ('gaming', 'Gaming'),
  ('payments', 'Payments'),
  ('depin', 'DePin'),
  ('developer_tooling', 'Developer tooling'),
  ('social', 'Social'),
  ('security', 'Security'),
  ('other', 'Other')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name;

ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Interests are viewable by everyone" ON public.interests;
CREATE POLICY "Interests are viewable by everyone"
  ON public.interests FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Profile interests are viewable by everyone" ON public.profile_interests;
CREATE POLICY "Profile interests are viewable by everyone"
  ON public.profile_interests FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile interests" ON public.profile_interests;
CREATE POLICY "Users can insert own profile interests"
  ON public.profile_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile interests" ON public.profile_interests;
CREATE POLICY "Users can update own profile interests"
  ON public.profile_interests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile interests" ON public.profile_interests;
CREATE POLICY "Users can delete own profile interests"
  ON public.profile_interests FOR DELETE
  USING (auth.uid() = user_id);
