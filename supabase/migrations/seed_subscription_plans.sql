-- Заполнение начальных планов подписки
-- Выполняется после add_subscriptions_system.sql

-- Вставляем планы подписки
INSERT INTO public.plans (code, price, currency, interval_days, is_active)
VALUES
  ('monthly', 9.99, 'usd', 30, true),
  ('yearly', 99.99, 'usd', 365, true),
  ('test', 0.4, 'usd', 31, true),
  ('pro', 10.00, 'usd', 31, true)
ON CONFLICT (code) DO UPDATE
SET 
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  interval_days = EXCLUDED.interval_days,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Комментарии к планам
COMMENT ON TABLE public.plans IS 'Планы подписки: monthly (30 дней), yearly (365 дней), pro (10 USD, 31 день) и test (0.4 USD, 31 день)';

