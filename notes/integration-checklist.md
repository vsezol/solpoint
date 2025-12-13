# 📋 Чеклист интеграции с бэкендом

## 🔴 Фаза 1: Подготовка и Аутентификация

### Настройка окружения
- [ ] Создать Supabase проект
- [ ] Выполнить SQL миграцию (`supabase/schema.sql`)
- [ ] Настроить `.env.local` файл
- [ ] Проверить Supabase клиенты работают

### Twitter OAuth
- [ ] Настроить Twitter Developer App
- [ ] Настроить Twitter OAuth в Supabase Dashboard
- [ ] Добавить redirect URLs
- [ ] Протестировать OAuth flow

### Auth Context & Hooks
- [ ] Создать `src/contexts/AuthContext.tsx`
- [ ] Создать `src/hooks/useAuth.ts`
- [ ] Реализовать `getCurrentUser()`
- [ ] Реализовать `signInWithTwitter()`
- [ ] Реализовать `signOut()`

### Login/Signup Pages
- [ ] Интегрировать `src/app/login/page.tsx` с Supabase Auth
- [ ] Интегрировать `src/app/signup/page.tsx` с Supabase Auth
- [ ] Добавить обработку ошибок
- [ ] Редирект после успешной авторизации

### Middleware
- [ ] Обновить `src/middleware.ts` для защиты роутов
- [ ] Проверка аутентификации
- [ ] Проверка VIP статуса для защищенных страниц

---

## 🔴 Фаза 2: Profile API

### API Functions (`src/lib/api/profiles.ts`)
- [ ] `getCurrentUser()` - получить текущего пользователя
- [ ] `getUserById(id)` - получить пользователя по ID
- [ ] `updateProfile(data)` - обновить профиль
- [ ] `getUserFriends(userId)` - получить друзей
- [ ] `getUserEvents(userId)` - получить события пользователя
- [ ] `connectWallet(address)` - подключить кошелек

### Profile Page Integration
- [ ] Заменить `mockUsers[0]` на `getCurrentUser()`
- [ ] Загрузить друзей из БД вместо `mockUsers.slice(1, 4)`
- [ ] Загрузить события из `event_attendees`
- [ ] Добавить форму редактирования профиля
- [ ] Реализовать обновление профиля
- [ ] Loading states
- [ ] Error handling

---

## 🔴 Фаза 3: Events API

### API Functions (`src/lib/api/events.ts`)
- [ ] `getEvents(filters?)` - получить все события с фильтрами
- [ ] `getEventById(id)` - получить событие по ID
- [ ] `createEvent(data)` - создать событие
- [ ] `updateEvent(id, data)` - обновить событие
- [ ] `deleteEvent(id)` - удалить событие
- [ ] `registerForEvent(eventId)` - зарегистрироваться на событие
- [ ] `unregisterFromEvent(eventId)` - отменить регистрацию
- [ ] `getEventAttendees(eventId)` - получить участников

### Events Page Integration
- [ ] Заменить `mockEvents` на `getEvents()`
- [ ] Реализовать server-side поиск
- [ ] Реализовать фильтрацию по типу
- [ ] Применить RLS для VIP событий
- [ ] Добавить кнопку "Register"
- [ ] Показать статус регистрации
- [ ] Loading states
- [ ] Пагинация

### Event Detail Page (новая)
- [ ] Создать `src/app/events/[id]/page.tsx`
- [ ] Детальная информация о событии
- [ ] Список участников
- [ ] Кнопка регистрации/отмены

---

## 🟡 Фаза 4: Hubs API

### API Functions (`src/lib/api/hubs.ts`)
- [ ] `getHubs(filters?)` - получить все хабы
- [ ] `getHubById(id)` - получить хаб по ID
- [ ] `joinHub(hubId)` - вступить в хаб
- [ ] `leaveHub(hubId)` - покинуть хаб
- [ ] `getHubMembers(hubId)` - получить участников хаба

### Hubs Page Integration
- [ ] Заменить `mockHubs` на `getHubs()`
- [ ] Реализовать поиск
- [ ] Загрузить статистику из БД
- [ ] Добавить кнопку "Join Hub"
- [ ] Loading states
- [ ] Error handling

### Hub Detail Page (новая)
- [ ] Создать `src/app/hubs/[id]/page.tsx`
- [ ] Детальная информация о хабе
- [ ] Список участников
- [ ] Связанные события

---

## 🟡 Фаза 5: Map API

### API Functions (`src/lib/api/map.ts`)
- [ ] `getMapMarkers(filters)` - получить все маркеры
- [ ] `getMarkersByBounds(bounds)` - маркеры в области просмотра
- [ ] Оптимизация запросов (pagination, limits)

### Map Page Integration
- [ ] Заменить `getMockMarkers()` на `getMapMarkers()`
- [ ] Реализовать фильтры (users, events, hubs)
- [ ] Фильтр по ролям пользователей
- [ ] Фильтр "Open to meet"
- [ ] Viewport-based loading
- [ ] Marker clustering
- [ ] Попапы с информацией

---

## 🟢 Фаза 6: Messages (VIP Only)

### API Functions (`src/lib/api/messages.ts`)
- [ ] `getConversations()` - получить список чатов
- [ ] `getMessages(userId)` - получить сообщения с пользователем
- [ ] `sendMessage(receiverId, content)` - отправить сообщение
- [ ] `markAsRead(messageId)` - отметить прочитанным

### Messages Page (новая)
- [ ] Создать `src/app/messages/page.tsx`
- [ ] Список конверсаций
- [ ] Chat UI
- [ ] Real-time обновления (Supabase Realtime)
- [ ] Защита роута (только VIP)
- [ ] Уведомления о новых сообщениях

---

## 🟡 Фаза 7: Subscriptions & Wallet

### Solana Wallet Integration
- [ ] Установить `@solana/wallet-adapter-react`
- [ ] Установить `@solana/web3.js`
- [ ] Создать `src/contexts/WalletContext.tsx`
- [ ] Интегрировать Wallet Adapter UI
- [ ] Кнопка "Connect Wallet"

### API Functions (`src/lib/api/subscriptions.ts`)
- [ ] `getSubscriptionStatus()` - проверить статус подписки
- [ ] `createVipSubscription(txSignature)` - создать VIP подписку
- [ ] `verifyTransaction(signature)` - проверить транзакцию
- [ ] `cancelSubscription()` - отменить подписку

### Subscription Page Integration
- [ ] Обновить `src/app/subscription/page.tsx`
- [ ] Отображение тарифов (Free vs VIP)
- [ ] Кнопка "Upgrade to VIP"
- [ ] Обработка Solana payment
- [ ] Подтверждение транзакции
- [ ] Обновление subscription_tier в БД

### Profile Wallet Integration
- [ ] Показать подключенный кошелек в профиле
- [ ] Кнопка "Connect Wallet" в профиле
- [ ] Сохранение wallet_address в БД

---

## 🟢 Фаза 8: Дополнительный функционал

### Friends System
- [ ] API для добавления друзей (`src/lib/api/friends.ts`)
- [ ] Отправка запроса в друзья
- [ ] Принятие/отклонение запроса
- [ ] Список друзей
- [ ] Mutual friends logic

### Search & Discovery
- [ ] Глобальный поиск пользователей
- [ ] Поиск по хабам
- [ ] Nearby users (геопоиск)
- [ ] Рекомендации событий

### Notifications
- [ ] Система уведомлений
- [ ] Уведомления о новых сообщениях
- [ ] Уведомления о событиях
- [ ] Real-time через Supabase

---

## 🧹 Фаза 9: Очистка и Оптимизация

### Удаление моковых данных
- [ ] Удалить использование `mockUsers` из всех файлов
- [ ] Удалить использование `mockEvents` из всех файлов
- [ ] Удалить использование `mockHubs` из всех файлов
- [ ] Удалить `getMockMarkers()` из Map Page
- [ ] Удалить файл `src/lib/mock-data.ts` (опционально, оставить для тестов)

### Performance Optimization
- [ ] Настроить React Query или SWR
- [ ] Кеширование запросов
- [ ] Debounce для поиска
- [ ] Lazy loading изображений
- [ ] Code splitting

### Error Handling
- [ ] Глобальный Error Boundary
- [ ] Toast notifications для ошибок
- [ ] Retry logic для failed requests
- [ ] Fallback UI

### Loading States
- [ ] Skeleton loaders для всех страниц
- [ ] Spinner components
- [ ] Optimistic updates где возможно

### Testing
- [ ] Unit тесты для API functions
- [ ] Integration тесты для критичных flow
- [ ] E2E тесты (опционально)

---

## 📊 Seed данные (опционально)

### Импорт моковых данных в Supabase
- [ ] Скрипт для импорта mockUsers в profiles
- [ ] Скрипт для импорта mockEvents в events
- [ ] Скрипт для импорта mockHubs в hubs
- [ ] Тестовые данные для разработки

---

## ✅ Финальная проверка

### Функциональность
- [ ] Все страницы работают с реальными данными
- [ ] Twitter OAuth работает корректно
- [ ] VIP функции доступны только VIP пользователям
- [ ] Карта отображает реальные маркеры
- [ ] Регистрация на события работает
- [ ] Профиль можно редактировать

### Безопасность
- [ ] RLS политики применяются корректно
- [ ] VIP контент защищен
- [ ] Middleware защищает приватные роуты
- [ ] Валидация данных на клиенте и сервере

### UX/UI
- [ ] Нет "flashing" контента при загрузке
- [ ] Loading states везде
- [ ] Error messages понятны пользователю
- [ ] Responsive design работает

### Performance
- [ ] Нет лишних перерендеров
- [ ] Запросы кешируются
- [ ] Карта загружается быстро
- [ ] Lighthouse score > 90

---

## 🎯 Приоритеты (Quick Reference)

### 🔴 Критично (Первая неделя)
- Auth & Twitter OAuth
- Profile API & Page
- Events API & Page

### 🟡 Важно (Вторая неделя)
- Hubs API & Page
- Map API & Page
- Subscriptions & Wallet

### 🟢 Можно отложить
- Messages (VIP feature)
- Friends system
- Notifications
- Advanced search

---

**Дата создания:** 13 декабря 2025  
**Статус:** 📋 Готов к работе  
**Прогресс:** 0/100 ✅

