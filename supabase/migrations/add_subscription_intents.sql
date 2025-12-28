-- Миграция: Система pending intents для подписок
-- Позволяет неавторизованным пользователям покупать подписки
-- Date: 2024

-- 1. Создаем таблицу subscription_intents
CREATE TABLE public.subscription_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intent_id TEXT UNIQUE NOT NULL, -- Публичный ID для активации (код)
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  email TEXT NOT NULL, -- Email пользователя (для восстановления)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'claimed', 'expired')),
  tx_signature TEXT, -- Signature транзакции (для Solana)
  provider_payment_id TEXT, -- ID платежа от провайдера (для NowPayments)
  provider TEXT, -- 'solana' или 'nowpayments'
  expires_at TIMESTAMPTZ NOT NULL, -- Intent истекает через 15 минут
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Привязывается после логина
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_expires_at_future CHECK (expires_at > created_at)
);

-- 2. Индексы для производительности
CREATE INDEX idx_subscription_intents_intent_id ON public.subscription_intents(intent_id);
CREATE INDEX idx_subscription_intents_email ON public.subscription_intents(email);
CREATE INDEX idx_subscription_intents_status ON public.subscription_intents(status);
CREATE INDEX idx_subscription_intents_expires_at ON public.subscription_intents(expires_at);
CREATE INDEX idx_subscription_intents_tx_signature ON public.subscription_intents(tx_signature) WHERE tx_signature IS NOT NULL;
CREATE INDEX idx_subscription_intents_provider_payment_id ON public.subscription_intents(provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE INDEX idx_subscription_intents_user_id ON public.subscription_intents(user_id) WHERE user_id IS NOT NULL;

-- 3. Триггер для обновления updated_at
CREATE TRIGGER subscription_intents_updated_at
BEFORE UPDATE ON public.subscription_intents
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Функция для автоматической очистки истекших intents
CREATE OR REPLACE FUNCTION cleanup_expired_intents()
RETURNS void AS $$
BEGIN
  UPDATE public.subscription_intents
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 5. Row Level Security отключен для MVP
-- Все запросы идут через backend API, RLS не нужен
ALTER TABLE public.subscription_intents DISABLE ROW LEVEL SECURITY;

-- 6. Комментарии
COMMENT ON TABLE public.subscription_intents IS 'Pending intents для подписок от неавторизованных пользователей';
COMMENT ON COLUMN public.subscription_intents.intent_id IS 'Публичный ID для активации подписки (используется в URL /activate?code=INTENT_ID)';
COMMENT ON COLUMN public.subscription_intents.status IS 'Статус intent: pending (создан, ожидает оплаты), paid (оплачен, ожидает активации), claimed (активирован), expired (истек)';
COMMENT ON COLUMN public.subscription_intents.email IS 'Email пользователя для восстановления подписки';
COMMENT ON COLUMN public.subscription_intents.user_id IS 'Привязывается после логина/регистрации пользователя';

