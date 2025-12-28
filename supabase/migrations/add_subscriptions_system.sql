-- Миграция: Система подписок с интеграцией NowPayments
-- Создает таблицы: plans, payments, subscriptions
-- Обновляет существующую таблицу subscriptions

-- 1. Удаляем старую таблицу subscriptions (если она существует)
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- 2. Создаем таблицу plans (планы подписки)
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- "monthly", "yearly"
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  interval_days INTEGER NOT NULL, -- 30 для monthly, 365 для yearly
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_interval_days_positive CHECK (interval_days > 0),
  CONSTRAINT check_price_positive CHECK (price > 0)
);

-- 3. Создаем таблицу payments (платежи)
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'nowpayments', -- провайдер платежей
  provider_payment_id TEXT, -- ID платежа от провайдера (payment_id из NowPayments)
  tx_hash TEXT, -- hash транзакции / signature
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'waiting', 'confirming', 'confirmed', 'finished', 'failed', 'refunded', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Дополнительные поля для NowPayments (опционально, для полной интеграции)
  parent_payment_id TEXT, -- для повторных депозитов
  purchase_id TEXT, -- purchase_id из NowPayments
  pay_address TEXT, -- адрес для депозита
  pay_amount DECIMAL(20, 8), -- сумма в криптовалюте
  pay_currency TEXT, -- валюта платежа (btc, eth, sol и т.д.)
  price_amount DECIMAL(10, 2), -- цена в фиате
  price_currency TEXT, -- валюта цены (usd, eur и т.д.)
  outcome_amount DECIMAL(20, 8), -- итоговая сумма после конвертации
  outcome_currency TEXT, -- итоговая валюта
  CONSTRAINT check_amount_positive CHECK (amount > 0)
);

-- 4. Создаем таблицу subscriptions (подписки)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Связь с последним платежом
  last_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  CONSTRAINT check_period_end_future CHECK (current_period_end > created_at)
);

-- 5. Индексы для производительности
CREATE INDEX idx_plans_code ON public.plans(code);
CREATE INDEX idx_plans_is_active ON public.plans(is_active);

CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_provider_payment_id ON public.payments(provider_payment_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX idx_payments_tx_hash ON public.payments(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX idx_payments_provider ON public.payments(provider);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_current_period_end ON public.subscriptions(current_period_end);
CREATE INDEX idx_subscriptions_user_status ON public.subscriptions(user_id, status);

-- 6. Триггер для обновления updated_at
CREATE TRIGGER plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. Row Level Security (RLS)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 8. RLS политики для plans (публичные планы видны всем, редактирование только админам)
CREATE POLICY "Plans are viewable by everyone"
  ON public.plans FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage plans"
  ON public.plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );

-- 9. RLS политики для payments
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );

CREATE POLICY "Users can create their own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update payments"
  ON public.payments FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );

-- 10. RLS политики для subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );

CREATE POLICY "Users can create their own subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
  ON public.subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );

-- 11. Функция для автоматического обновления subscription_tier в profiles
CREATE OR REPLACE FUNCTION update_user_subscription_tier()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Определяем user_id в зависимости от операции
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;
  
  -- Обновляем subscription_tier в profiles на основе активной подписки
  UPDATE public.profiles
  SET subscription_tier = CASE
    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = target_user_id
      AND status = 'active'
      AND current_period_end > NOW()
    ) THEN 'vip'::subscription_tier
    ELSE 'free'::subscription_tier
  END
  WHERE id = target_user_id;
  
  -- Возвращаем правильное значение в зависимости от операции
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления tier при изменении подписки
CREATE TRIGGER update_subscription_tier_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION update_user_subscription_tier();

-- 12. Комментарии к таблицам
COMMENT ON TABLE public.plans IS 'Планы подписки (monthly, yearly и т.д.)';
COMMENT ON TABLE public.payments IS 'Платежи через NowPayments и другие провайдеры';
COMMENT ON TABLE public.subscriptions IS 'Активные подписки пользователей';

COMMENT ON COLUMN public.payments.provider IS 'Провайдер платежей (nowpayments, stripe и т.д.)';
COMMENT ON COLUMN public.payments.provider_payment_id IS 'ID платежа от провайдера (payment_id из NowPayments API)';
COMMENT ON COLUMN public.payments.tx_hash IS 'Hash транзакции блокчейна или signature';
COMMENT ON COLUMN public.payments.status IS 'Статус платежа: pending, waiting, confirming, confirmed, finished, failed, refunded, expired';
COMMENT ON COLUMN public.subscriptions.status IS 'Статус подписки: active, expired, cancelled, pending';

