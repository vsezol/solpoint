-- Миграция: Добавление поля expected_amount_lamports в subscription_intents
-- Для проверки точной суммы платежа
-- Date: 2024

ALTER TABLE public.subscription_intents
  ADD COLUMN IF NOT EXISTS expected_amount_lamports BIGINT;

-- Комментарий
COMMENT ON COLUMN public.subscription_intents.expected_amount_lamports IS 'Ожидаемая сумма платежа в lamports (для проверки точности оплаты)';

