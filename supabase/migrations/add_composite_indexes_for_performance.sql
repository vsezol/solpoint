-- Composite indexes for the most common query patterns

-- follows: friendship checks (WHERE follower_id = ? AND following_id IN ?)
CREATE INDEX IF NOT EXISTS idx_follows_follower_following
  ON public.follows(follower_id, following_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_follower
  ON public.follows(following_id, follower_id);

-- events: upcoming public events (WHERE visibility = 'public' AND start_date >= now())
CREATE INDEX IF NOT EXISTS idx_events_visibility_start_date
  ON public.events(visibility, start_date);

-- events: upcoming public events filtered by country
CREATE INDEX IF NOT EXISTS idx_events_country_visibility_start
  ON public.events(country_code, visibility, start_date);

-- subscriptions: active subscriptions check (WHERE status = 'active' AND current_period_end > now())
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_period
  ON public.subscriptions(status, current_period_end)
  WHERE status = 'active';
