# Настройка модуля оплаты через Solana

Этот документ описывает настройку нового модуля оплаты через Solana с использованием WalletConnect.

## Обзор

Модуль позволяет пользователям оплачивать подписки напрямую через Solana кошельки (Phantom, Solflare и др.) с использованием WalletConnect. Backend проверяет транзакции через Solana RPC и активирует подписку после подтверждения.

## Архитектура

### Frontend
- **WalletProvider** - провайдер Solana Wallet Adapter
- **SolanaPaymentButton** - компонент для оплаты через Solana
- Интеграция на странице подписок с выбором способа оплаты

### Backend
- **API Endpoint**: `/api/subscriptions/solana-payment`
- Проверка транзакций через Solana RPC
- Валидация платежей и активация подписок

## Настройка

### 1. Переменные окружения

Добавьте следующие переменные в ваш `.env.local`:

```env
# Solana RPC URL (можно использовать QuickNode, Helius или публичный RPC)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# Или используйте QuickNode/Helius для лучшей производительности:
# SOLANA_RPC_URL=https://your-quicknode-url.solana-mainnet.quiknode.pro/your-token/

# Solana адрес получателя (ваш SOL-адрес для получения платежей)
SOLANA_RECIPIENT_ADDRESS=your_solana_wallet_address_here

# Публичные переменные для фронтенда
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_RECIPIENT_ADDRESS=your_solana_wallet_address_here
NEXT_PUBLIC_SOL_PRICE_USD=100
```

### 2. Получение Solana адреса

1. Создайте новый Solana кошелек или используйте существующий
2. Скопируйте публичный адрес (Public Key)
3. Добавьте его в переменные окружения как `SOLANA_RECIPIENT_ADDRESS` и `NEXT_PUBLIC_SOLANA_RECIPIENT_ADDRESS`

### 3. Настройка RPC провайдера (рекомендуется)

Для production рекомендуется использовать надежный RPC провайдер:

#### QuickNode
1. Зарегистрируйтесь на [QuickNode](https://www.quicknode.com/)
2. Создайте endpoint для Solana Mainnet
3. Скопируйте HTTP URL и добавьте в `SOLANA_RPC_URL`

#### Helius
1. Зарегистрируйтесь на [Helius](https://www.helius.dev/)
2. Создайте API ключ
3. Используйте URL: `https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY`

### 4. Курс SOL/USD

Переменная `NEXT_PUBLIC_SOL_PRICE_USD` используется для расчета суммы в SOL на фронтенде. 
Для production рекомендуется получать актуальный курс из API (например, CoinGecko).

## Использование

### Для пользователей

1. Перейдите на страницу подписок (`/subscription`)
2. Нажмите "Upgrade to PRO" на нужном плане
3. Выберите способ оплаты:
   - **Криптовалюты (NowPayments)** - существующий модуль
   - **Solana (SOL)** - новый модуль через WalletConnect
4. Если выбран Solana:
   - Подключите кошелек (Phantom, Solflare и др.)
   - Подтвердите транзакцию в кошельке
   - Подписка активируется автоматически после подтверждения

### Для разработчиков

#### Компонент SolanaPaymentButton

```tsx
import { SolanaPaymentButton } from "@/components/subscription/solana-payment-button";

<SolanaPaymentButton
  plan={plan}
  onSuccess={() => {
    // Обработка успешной оплаты
  }}
  onError={(error) => {
    // Обработка ошибки
  }}
/>
```

#### API Endpoint

```typescript
POST /api/subscriptions/solana-payment
Body: {
  signature: string;  // Signature транзакции Solana
  payer: string;     // Public key отправителя
  plan_id: string;   // ID плана подписки
}
```

## Проверка транзакций

Backend выполняет следующие проверки:

1. ✅ Транзакция существует и финализирована
2. ✅ `meta.err === null` (транзакция успешна)
3. ✅ Получатель = наш SOL-адрес
4. ✅ Сумма >= требуемой
5. ✅ Signature не использовалась ранее (защита от повторного использования)

## Безопасность

- Все проверки выполняются на backend
- Frontend только отправляет транзакцию и передает signature
- Каждая signature проверяется на уникальность
- Используется commitment=finalized для гарантии финализации транзакции

## Troubleshooting

### Транзакция не находится

- Убедитесь, что транзакция была отправлена в mainnet-beta
- Проверьте, что транзакция финализирована (может занять несколько секунд)
- Проверьте правильность RPC URL

### Ошибка "Transaction recipient does not match"

- Убедитесь, что `SOLANA_RECIPIENT_ADDRESS` установлен правильно
- Проверьте, что транзакция действительно отправлена на этот адрес

### Ошибка "Insufficient payment amount"

- Проверьте курс SOL/USD в `NEXT_PUBLIC_SOL_PRICE_USD`
- Убедитесь, что пользователь отправил достаточную сумму

## Дополнительные улучшения

- [ ] Получение актуального курса SOL/USD из API
- [ ] Поддержка других сетей (devnet для тестирования)
- [ ] Логирование всех транзакций для аудита
- [ ] Уведомления пользователям о статусе платежа

