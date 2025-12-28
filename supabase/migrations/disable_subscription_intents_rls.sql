-- Миграция: Отключение RLS для subscription_intents
-- Для MVP не нужны ограничения RLS, все запросы идут через backend API
-- Date: 2024

-- Удаляем все политики RLS
DROP POLICY IF EXISTS "Anyone can create subscription intents" ON public.subscription_intents;
DROP POLICY IF EXISTS "Users can view intents by email" ON public.subscription_intents;
DROP POLICY IF EXISTS "System can update subscription intents" ON public.subscription_intents;
DROP POLICY IF EXISTS "Admins can view all subscription intents" ON public.subscription_intents;

-- Отключаем RLS
ALTER TABLE public.subscription_intents DISABLE ROW LEVEL SECURITY;

