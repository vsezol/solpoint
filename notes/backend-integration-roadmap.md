# Roadmap интеграции с бэкендом SolPoint

## 📋 Содержание
1. [Текущее состояние проекта](#текущее-состояние-проекта)
2. [Зависимости от моковых данных](#зависимости-от-моковых-данных)
3. [Структура бэкенда](#структура-бэкенда)
4. [План интеграции](#план-интеграции)
5. [Этапы реализации](#этапы-реализации)

---

## 🎯 Текущее состояние проекта

### Готовая инфраструктура
- ✅ Supabase схема БД (`supabase/schema.sql`)
- ✅ Supabase клиенты (`src/lib/supabase/`)
- ✅ TypeScript типы (`src/types/index.ts`)
- ✅ Middleware для аутентификации (`src/middleware.ts`)
- ✅ UI компоненты
- ✅ Моковые данные для разработки

### Основные сущности
- **Users** (Пользователи)
- **Events** (События)
- **Hubs** (Хабы/Сообщества)
- **Messages** (Сообщения - только VIP)
- **Subscriptions** (Подписки VIP)

---

## 📦 Зависимости от моковых данных

### Файл с моковыми данными
**Файл:** `src/lib/mock-data.ts`

**Экспортируемые данные:**
- `mockUsers` - массив из 5 тестовых пользователей
- `mockEvents` - массив из 4 тестовых событий
- `mockHubs` - массив из 4 тестовых хабов
- `getMockMarkers()` - функция создания маркеров для карты
- `createMapMarkers()` - вспомогательная функция

---

## 📄 Страницы, использующие моковые данные

### 1. **Profile Page** (`src/app/profile/page.tsx`)
**Используемые данные:**
- `mockUsers[0]` - текущий пользователь (hardcoded)
- `mockUsers.slice(1, 4)` - друзья/mutual friends
- `mockEvents` - предстоящие и прошедшие события

**Что отображается:**
- Профиль пользователя (аватар, био, локация)
- Статус подписки (Free/VIP)
- Социальные ссылки
- Взаимные друзья
- Предстоящие события (upcoming)
- Прошедшие события (past)
- Кошелек Solana

**TODO для интеграции:**
- [ ] Получать текущего пользователя из Supabase Auth
- [ ] Загружать друзей из таблицы `friends`
- [ ] Загружать события пользователя из `event_attendees`
- [ ] Обновление профиля через API
- [ ] Подключение кошелька

---

### 2. **Events Page** (`src/app/events/page.tsx`)
**Используемые данные:**
- `mockEvents` - все события

**Функционал:**
- Поиск событий по названию, городу, стране
- Фильтрация по типу (official, community, meetup, private)
- Разделение на upcoming и past events
- Скрытие VIP событий для free пользователей

**TODO для интеграции:**
- [ ] Загрузка событий из таблицы `events`
- [ ] Server-side фильтрация и поиск
- [ ] Применение RLS политик для VIP событий
- [ ] Пагинация событий
- [ ] Регистрация на событие (`event_attendees`)

---

### 3. **Hubs Page** (`src/app/hubs/page.tsx`)
**Используемые данные:**
- `mockHubs` - все хабы

**Функционал:**
- Поиск хабов по названию, стране
- Статистика (общее количество участников, стран)
- Отображение карточек хабов

**TODO для интеграции:**
- [ ] Загрузка хабов из таблицы `hubs`
- [ ] Server-side поиск
- [ ] Подсчет статистики из БД
- [ ] Вступление в хаб (`hub_members`)
- [ ] Фильтрация по странам

---

### 4. **Map Page** (`src/app/map/page.tsx`)
**Используемые данные:**
- `getMockMarkers()` - все маркеры (users, events, hubs)

**Функционал:**
- Интерактивная карта с маркерами
- Фильтры по типу маркеров
- Отображение пользователей, событий и хабов

**TODO для интеграции:**
- [ ] Загрузка координат из БД
- [ ] Server-side фильтрация маркеров
- [ ] Оптимизация загрузки (lazy loading, clustering)
- [ ] Фильтры по ролям пользователей
- [ ] Геопоиск по стране/городу

---

### 5. **Landing Page** (`src/app/page.tsx`)
**Используемые данные:**
- Не использует моковые данные напрямую
- Статические секции (Hero, About, Team)

**TODO для интеграции:**
- [ ] Возможно добавить статистику (количество пользователей, событий)

---

## 🗂️ Компоненты, использующие моковые данные

### Карточки (Cards)
1. **EventCard** (`src/components/cards/event-card.tsx`)
   - Принимает пропс `event: Event`
   - Используется на Events и Profile страницах

2. **HubCard** (`src/components/cards/hub-card.tsx`)
   - Принимает пропс `hub: Hub`
   - Используется на Hubs странице

3. **UserCard** (`src/components/cards/user-card.tsx`)
   - Принимает пропс `user: User`
   - Потенциально используется для отображения пользователей

### Map компоненты
1. **SolPointMap** (`src/components/map/solpoint-map.tsx`)
   - Принимает `markers: MapMarker[]`
   - Рендерит карту с маркерами

2. **MapFiltersPanel** (`src/components/map/map-filters.tsx`)
   - Управляет фильтрами карты

---

## 🔧 Структура бэкенда

### Supabase таблицы

#### 1. `profiles` (пользователи)
```sql
- id (UUID, FK to auth.users)
- twitter_id, twitter_handle, twitter_name
- avatar_url, bio
- country, city
- role (enum)
- is_open_to_meet, is_verified
- subscription_tier (free/vip)
- wallet_address
- socials (JSONB)
- last_active_at
- created_at, updated_at
```

#### 2. `events` (события)
```sql
- id (UUID)
- name, description, image_url
- country, city, address
- latitude, longitude
- start_date, end_date
- event_type (enum)
- visibility (public/vip_only)
- is_paid, price_sol
- max_attendees, attendees_count
- socials (JSONB)
- organizer_id (FK to profiles)
- created_at, updated_at
```

#### 3. `hubs` (хабы)
```sql
- id (UUID)
- name, description, image_url
- country, city
- latitude, longitude
- members_count
- socials (JSONB)
- created_at, updated_at
```

#### 4. `event_attendees` (участники событий)
```sql
- id, event_id, user_id
- registered_at
```

#### 5. `hub_members` (участники хабов)
```sql
- id, hub_id, user_id
- joined_at
```

#### 6. `messages` (сообщения - VIP only)
```sql
- id, sender_id, receiver_id
- content, is_read
- created_at
```

#### 7. `friends` (друзья)
```sql
- id, user_id, friend_id
- status (pending/accepted/blocked)
- created_at
```

#### 8. `subscriptions` (подписки VIP)
```sql
- id, user_id, tier
- started_at, expires_at
- tx_signature (Solana transaction)
- created_at
```

### RLS (Row Level Security)
- ✅ Настроены политики безопасности
- ✅ Публичные данные доступны всем
- ✅ VIP контент доступен только VIP пользователям
- ✅ Пользователи могут редактировать свой профиль

---

## 🚀 План интеграции

### Фаза 1: Аутентификация и профили (Критично)
**Приоритет:** 🔴 Высокий

#### 1.1 Twitter OAuth
- [ ] Настроить Twitter OAuth в Supabase
- [ ] Создать endpoints для авторизации
- [ ] Реализовать Login/Signup flow
- [ ] Сохранять данные из Twitter в `profiles`

#### 1.2 Auth Context
- [ ] Создать `src/contexts/AuthContext.tsx`
- [ ] Реализовать хуки: `useAuth()`, `useUser()`
- [ ] Проверка subscription_tier
- [ ] Обработка состояний загрузки

#### 1.3 Profile API
**Файл:** `src/lib/api/profiles.ts`
```typescript
- getCurrentUser()
- getUserById(id)
- updateProfile(data)
- getUserFriends(userId)
- connectWallet(address)
```

---

### Фаза 2: События (Events)
**Приоритет:** 🔴 Высокий

#### 2.1 Events API
**Файл:** `src/lib/api/events.ts`
```typescript
- getEvents(filters?) // с поддержкой search, type, visibility
- getEventById(id)
- createEvent(data)
- updateEvent(id, data)
- registerForEvent(eventId)
- unregisterFromEvent(eventId)
- getUserEvents(userId) // upcoming & past
```

#### 2.2 Events Page Integration
- [ ] Заменить `mockEvents` на `getEvents()`
- [ ] Реализовать server-side filtering
- [ ] Добавить loading states
- [ ] Обработка ошибок
- [ ] Применить RLS для VIP событий

---

### Фаза 3: Хабы (Hubs)
**Приоритет:** 🟡 Средний

#### 3.1 Hubs API
**Файл:** `src/lib/api/hubs.ts`
```typescript
- getHubs(filters?)
- getHubById(id)
- joinHub(hubId)
- leaveHub(hubId)
- getHubMembers(hubId)
```

#### 3.2 Hubs Page Integration
- [ ] Заменить `mockHubs` на `getHubs()`
- [ ] Реализовать поиск
- [ ] Показать статистику из БД
- [ ] Функционал вступления в хаб

---

### Фаза 4: Карта (Map)
**Приоритет:** 🟡 Средний

#### 4.1 Map API
**Файл:** `src/lib/api/map.ts`
```typescript
- getMapMarkers(filters?) // users, events, hubs
- getMarkersByBounds(bounds)
```

#### 4.2 Map Page Integration
- [ ] Заменить `getMockMarkers()` на API
- [ ] Реализовать фильтры
- [ ] Оптимизация загрузки (viewport-based)
- [ ] Marker clustering для производительности

---

### Фаза 5: Сообщения (VIP Feature)
**Приоритет:** 🟢 Низкий (только для VIP)

#### 5.1 Messages API
**Файл:** `src/lib/api/messages.ts`
```typescript
- getConversations()
- getMessages(conversationId)
- sendMessage(receiverId, content)
- markAsRead(messageId)
```

#### 5.2 Messages Page (новая)
- [ ] Создать `src/app/messages/page.tsx`
- [ ] Список конверсаций
- [ ] Chat интерфейс
- [ ] Real-time с Supabase Realtime
- [ ] Ограничение доступа только для VIP

---

### Фаза 6: Подписки (VIP Subscriptions)
**Приоритет:** 🟡 Средний

#### 6.1 Solana Wallet Integration
- [ ] Интеграция Solana Wallet Adapter
- [ ] Подключение кошелька
- [ ] Отображение баланса

#### 6.2 Payment Flow
**Файл:** `src/lib/api/subscriptions.ts`
```typescript
- createVipSubscription(txSignature)
- checkSubscriptionStatus()
- cancelSubscription()
```

#### 6.3 Subscription Page Integration
- [ ] Отображение тарифов
- [ ] Кнопка "Upgrade to VIP"
- [ ] Обработка Solana транзакции
- [ ] Сохранение tx_signature в БД
- [ ] Обновление subscription_tier

---

### Фаза 7: Дополнительный функционал
**Приоритет:** 🟢 Низкий

#### 7.1 Друзья (Friends)
- [ ] API для добавления/удаления друзей
- [ ] Отображение mutual friends
- [ ] Система запросов

#### 7.2 Уведомления
- [ ] Push notifications через Supabase
- [ ] Уведомления о новых событиях
- [ ] Уведомления о сообщениях (VIP)

#### 7.3 Поиск и рекомендации
- [ ] Глобальный поиск пользователей
- [ ] Рекомендации событий
- [ ] Nearby users/events

---

## 📝 Этапы реализации

### Этап 1: Подготовка (1 день)
- [ ] Настроить Supabase проект
- [ ] Выполнить migration схемы БД
- [ ] Настроить переменные окружения
- [ ] Создать структуру API файлов

### Этап 2: Аутентификация (2-3 дня)
- [ ] Twitter OAuth
- [ ] Auth Context
- [ ] Profile management
- [ ] Защита роутов

### Этап 3: События (2-3 дня)
- [ ] Events API
- [ ] Events Page интеграция
- [ ] Регистрация на события
- [ ] VIP события

### Этап 4: Хабы и Карта (2-3 дня)
- [ ] Hubs API
- [ ] Map API
- [ ] Интеграция страниц
- [ ] Оптимизация производительности

### Этап 5: VIP функции (3-4 дня)
- [ ] Wallet integration
- [ ] Subscription flow
- [ ] Messages (real-time)

### Этап 6: Полировка (2-3 дня)
- [ ] Error handling
- [ ] Loading states
- [ ] Оптимизация запросов
- [ ] Тестирование
- [ ] Удаление моковых данных

---

## 🔑 Ключевые файлы для создания

### API Layer
```
src/lib/api/
  ├── profiles.ts      # User profiles
  ├── events.ts        # Events CRUD
  ├── hubs.ts          # Hubs CRUD
  ├── map.ts           # Map markers
  ├── messages.ts      # Messages (VIP)
  ├── subscriptions.ts # VIP subscriptions
  └── friends.ts       # Friends management
```

### Context Providers
```
src/contexts/
  ├── AuthContext.tsx  # Authentication state
  └── WalletContext.tsx # Solana wallet
```

### Hooks
```
src/hooks/
  ├── useAuth.ts
  ├── useUser.ts
  ├── useEvents.ts
  ├── useHubs.ts
  └── useSubscription.ts
```

---

## ⚠️ Критические моменты

### 1. Безопасность
- ✅ Использовать Supabase RLS
- ✅ Валидация на клиенте И сервере
- ✅ Проверка VIP статуса для защищенных функций

### 2. Производительность
- ⚡ Пагинация для списков
- ⚡ Lazy loading на карте
- ⚡ Debounce для поиска
- ⚡ Caching с React Query / SWR

### 3. UX
- 💡 Loading states везде
- 💡 Error boundaries
- 💡 Optimistic updates
- 💡 Skeleton loaders

### 4. Миграция данных
- 📊 Сначала создать seed данные в Supabase
- 📊 Можно импортировать mockUsers/Events/Hubs как начальные данные
- 📊 Постепенная замена моков на API

---

## 🎯 Следующие шаги

### Немедленно:
1. ✅ Настроить Supabase проект
2. ✅ Выполнить SQL миграцию из `schema.sql`
3. ✅ Добавить `.env.local` с Supabase ключами
4. ✅ Создать структуру API папок

### На этой неделе:
1. 🔧 Реализовать Twitter OAuth
2. 🔧 Создать Auth Context
3. 🔧 Интегрировать Profile page

### Следующая неделя:
1. 📅 Events API и интеграция
2. 🏢 Hubs API и интеграция
3. 🗺️ Map API и интеграция

---

## 📚 Дополнительные ресурсы

### Документация
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)

### Библиотеки для интеграции
- `@supabase/supabase-js` - уже установлен
- `@solana/wallet-adapter-react` - для кошелька
- `@solana/web3.js` - для Solana транзакций
- `swr` или `@tanstack/react-query` - для data fetching

---

**Последнее обновление:** 13 декабря 2025  
**Статус:** 📋 Готов к началу интеграции

