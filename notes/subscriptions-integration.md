# Интеграция системы подписок с NowPayments

## Обзор

Система подписок интегрирована с NowPayments для обработки платежей в криптовалюте (SOL, USDT и др.).

## Настройка переменных окружения

Добавьте следующие переменные в ваш `.env.local` файл:

```env
# NowPayments API ключ
NOWPAYMENTS_API_KEY=your_api_key_here

# NowPayments IPN Secret Key (для верификации webhook'ов)
NOWPAYMENTS_IPN_SECRET=your_ipn_secret_here
```

### Где получить ключи:

1. **API Key**: 
   - Зарегистрируйтесь на [nowpayments.io](https://nowpayments.io)
   - Перейдите в Dashboard → API Settings
   - Создайте новый API ключ

2. **IPN Secret Key**:
   - В Dashboard → Payment Settings → Instant Payment Notifications
   - Создайте IPN Secret Key
   - ⚠️ **Важно**: Сохраните его сразу, он показывается только один раз!

## Настройка Webhook URL

В настройках NowPayments укажите URL для webhook'ов:

```
https://yourdomain.com/api/subscriptions/webhook
```

Для локальной разработки можно использовать ngrok или аналогичный сервис для туннелирования.

## API Endpoints

### 1. GET `/api/subscriptions/plans`
Получить список всех активных планов подписки.

**Ответ:**
```json
{
  "plans": [
    {
      "id": "uuid",
      "code": "monthly",
      "price": 9.99,
      "currency": "usd",
      "interval_days": 30,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. GET `/api/subscriptions/current`
Получить текущую активную подписку пользователя.

**Требует аутентификации.**

**Ответ:**
```json
{
  "subscription": {
    "id": "uuid",
    "user_id": "uuid",
    "plan_id": "uuid",
    "plan": { ... },
    "status": "active",
    "current_period_end": "2024-02-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 3. POST `/api/subscriptions/create-payment`
Создать платеж через NowPayments.

**Требует аутентификации.**

**Тело запроса:**
```json
{
  "plan_id": "uuid",
  "success_url": "https://yourdomain.com/subscription?success=true",
  "cancel_url": "https://yourdomain.com/subscription?cancelled=true"
}
```

**Ответ:**
```json
{
  "payment_id": "123456789",
  "payment_url": "https://nowpayments.io/payment/...",
  "pay_address": "SOL_ADDRESS",
  "pay_amount": 0.5,
  "pay_currency": "sol",
  "price_amount": 9.99,
  "price_currency": "USD",
  "status": "waiting",
  "expires_at": "2024-01-01T01:00:00Z"
}
```

### 4. POST `/api/subscriptions/webhook`
Webhook для обработки уведомлений от NowPayments.

**Не требует аутентификации** (проверка через HMAC подпись).

## Процесс оплаты

1. Пользователь выбирает план на странице `/subscription`
2. Нажимает кнопку "Upgrade"
3. Создается платеж через `/api/subscriptions/create-payment`
4. Пользователь редиректится на страницу оплаты NowPayments (или получает адрес для депозита)
5. После оплаты NowPayments отправляет webhook на `/api/subscriptions/webhook`
6. Система автоматически создает/обновляет подписку
7. Пользователь редиректится обратно на `/subscription?success=true`

## Автоматическое обновление subscription_tier

Триггер в базе данных автоматически обновляет `subscription_tier` в таблице `profiles`:
- Если есть активная подписка → `vip`
- Если подписка истекла или отменена → `free`

## Статусы платежей

- `pending` - Платеж создан, ожидает обработки
- `waiting` - Ожидает депозита от пользователя
- `confirming` - Платеж подтверждается в блокчейне
- `confirmed` - Платеж подтвержден
- `finished` - Платеж завершен, средства получены
- `failed` - Платеж не удался
- `refunded` - Платеж возвращен
- `expired` - Платеж истек

## Статусы подписок

- `active` - Подписка активна
- `expired` - Подписка истекла
- `cancelled` - Подписка отменена
- `pending` - Подписка ожидает оплаты

## Тестирование

### Локальное тестирование webhook'ов

Для тестирования webhook'ов локально используйте ngrok:

```bash
ngrok http 3000
```

Затем укажите полученный URL в настройках NowPayments:
```
https://your-ngrok-url.ngrok.io/api/subscriptions/webhook
```

### Тестовые платежи

NowPayments предоставляет тестовый режим. Используйте тестовые ключи для разработки.

## Troubleshooting

### Webhook не приходит

1. Проверьте, что IPN Secret Key правильно настроен
2. Убедитесь, что URL webhook доступен из интернета (не localhost)
3. Проверьте логи в Supabase Dashboard
4. Убедитесь, что firewall не блокирует запросы от NowPayments

### Платеж создан, но подписка не активируется

1. Проверьте логи webhook'ов в консоли
2. Убедитесь, что `payment_status === "finished"` в webhook
3. Проверьте, что `plan_id` правильно сохраняется в `purchase_id` платежа

### Ошибка "Invalid signature" в webhook

1. Проверьте, что `NOWPAYMENTS_IPN_SECRET` правильно установлен
2. Убедитесь, что используется правильный IPN Secret Key из Dashboard

## Безопасность

- Все webhook'ы проверяются через HMAC SHA-512 подпись
- API endpoints требуют аутентификации (кроме webhook)
- RLS политики защищают данные пользователей
- Платежи сохраняются в базе данных для аудита


