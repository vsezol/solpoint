-- Добавление тестового плана за $1 для тестирования Solana платежей
-- Этот план можно использовать для тестирования без больших затрат

INSERT INTO public.plans (code, price, currency, interval_days, is_active)
VALUES
  ('test_1usd', 1.00, 'usd', 30, true)
ON CONFLICT (code) DO UPDATE
SET 
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  interval_days = EXCLUDED.interval_days,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Комментарий
COMMENT ON TABLE public.plans IS 'Планы подписки: monthly (30 дней), yearly (365 дней), pro (10 USD, 31 день), test (0.4 USD, 31 день) и test_1usd (1 USD, 30 дней) для тестирования Solana платежей';

