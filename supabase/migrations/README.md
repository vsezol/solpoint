# Миграции базы данных SolPoint

## Быстрый старт

### Применение миграций

Для применения миграций в Supabase:

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **SQL Editor**
4. Откройте файл миграции и скопируйте содержимое
5. Вставьте в SQL Editor и нажмите **Run**

## Список миграций

### 1. `schema.sql` (Базовая схема)
Основная схема базы данных со всеми таблицами, индексами, RLS политиками.

**Статус:** Базовая миграция, должна быть применена первой.

---

### 2. `add_invites_and_referrals.sql`
Добавляет систему инвайтов и реферралов.

**Таблицы:**
- `invites` - инвайт-коды пользователей
- `referrals` - история использования инвайтов

**Функции:**
- `generate_invite_code()` - генерация уникального кода
- `get_invite_by_code()` - получение инвайта по коду
- `create_mutual_friendship()` - создание взаимной дружбы

---

### 3. `add_twitter_handle_index.sql`
Добавляет индекс для быстрого поиска по Twitter handle.

```sql
CREATE INDEX idx_profiles_twitter_handle ON public.profiles(twitter_handle);
```

---

### 4. `add_countries_and_location_fields.sql` ✨ НОВАЯ

Добавляет таблицу стран и обновляет поля локации в профилях.

**Что добавляет:**

1. **Таблица `countries`**
   - `code` CHAR(2) PRIMARY KEY (ISO 3166-1 alpha-2)
   - `name` TEXT NOT NULL (название страны)
   - ⚠️ Таблица создается пустой, заполнение через `seed_countries.sql`

2. **Обновления таблицы `profiles`**
   - Новое поле: `country_code` CHAR(2) NULL
   - Обновлено: `city` с ограничением 150 символов
   - Старое поле `country` помечено как DEPRECATED

3. **Constraints**
   - `country_code` uppercase, длина = 2, nullable
   - Foreign key на `countries.code`
   - `city` max length 150, nullable

4. **Индексы**
   - `idx_profiles_country_code`
   - `idx_profiles_city`

5. **View обновлен**
   - `country_stats` теперь использует `country_code` и `JOIN` с таблицей `countries`

**Применение:**

```bash
# 1. Примените миграцию через Supabase SQL Editor
# Файл: supabase/migrations/add_countries_and_location_fields.sql

# 2. Заполните таблицу countries всеми странами
# Файл: supabase/migrations/seed_countries.sql (249 стран из JSON)

# 3. (Опционально) Мигрируйте данные из старого поля country
# См. руководство: notes/countries-migration-guide.md
```

**Frontend интеграция:**
- ✅ TypeScript типы обновлены (`src/types/index.ts`)
- ✅ Утилиты для работы со странами (`src/lib/countries.ts`)
- ✅ UI компонент `CountrySelect` (`src/components/ui/country-select.tsx`)
- ✅ Форма профиля обновлена (`src/app/profile/profile-edit-form.tsx`)
- ✅ API endpoint обновлен (`src/app/api/profile/update/route.ts`)

**Документация:**
- 📖 Полное руководство: `notes/countries-migration-guide.md`

---

### 5. `seed_countries.sql` ✨ НОВАЯ

Заполняет таблицу `countries` всеми странами из JSON файла.

**Что делает:**
- Вставляет 249 стран из `supabase/countries.json`
- Использует `ON CONFLICT DO NOTHING` для безопасного повторного выполнения
- Автоматически сгенерирован из JSON файла

**Применение:**

```bash
# Выполните после add_countries_and_location_fields.sql
# Файл: supabase/migrations/seed_countries.sql
```

**Примечание:** Этот файл можно выполнять многократно - он безопасен благодаря `ON CONFLICT DO NOTHING`.

---

### 6. `migrate_friends_to_follows.sql` ✨ НОВАЯ

Миграция системы друзей на модель подписок (Instagram/Twitter).

**Что делает:**

1. **Создает таблицу `follows`**
   - Односторонние подписки (follower_id → following_id)
   - Индексы для производительности
   - RLS политики

2. **Создает представление `mutual_friends`**
   - Взаимные подписки = друзья
   - Автоматически вычисляется из `follows`

3. **Мигрирует существующие данные**
   - Принятые дружбы → двусторонние подписки
   - Ожидающие запросы → односторонние подписки

4. **Создает helper функции**
   - `is_following()` - проверить подписку
   - `are_mutual_friends()` - проверить взаимную дружбу
   - `get_follow_status()` - получить статус (none/following/follower/mutual)
   - `get_followers_count()` - количество подписчиков
   - `get_following_count()` - количество подписок
   - `get_mutual_friends_count()` - количество взаимных друзей

**Применение:**

```bash
# Выполните миграцию через Supabase SQL Editor
# Файл: supabase/migrations/migrate_friends_to_follows.sql
```

**Важно:**
- Старая таблица `friends` остается для обратной совместимости
- Все данные мигрируются автоматически
- После миграции используйте `follows` вместо `friends`

**Frontend интеграция:**
- ✅ API endpoint обновлен (`src/app/api/friends/route.ts`)
- ✅ Новый endpoint для списков (`src/app/api/friends/list/route.ts`)
- ✅ Страница профиля обновлена (`src/app/profile/[username]/page.tsx`)

---

### 7. `drop_friends_table.sql` ✨ НОВАЯ (ОПЦИОНАЛЬНО)

Удаляет устаревшую таблицу `friends` после успешной миграции на систему `follows`.

**⚠️ ВНИМАНИЕ:** Выполняйте эту миграцию ТОЛЬКО после:
1. Успешного выполнения `migrate_friends_to_follows.sql`
2. Проверки, что все данные мигрированы
3. Проверки, что новая система работает корректно
4. Создания резервной копии базы данных

**Что делает:**
- Удаляет функцию `create_mutual_friendship()` (обновлена в `add_invites_and_referrals.sql`)
- Удаляет RLS политики таблицы `friends`
- Удаляет таблицу `friends` (CASCADE удалит все зависимости)
- Проверяет наличие таблицы `follows` и представления `mutual_friends` перед удалением

**Применение:**

```bash
# Выполните ТОЛЬКО после проверки работы новой системы
# Файл: supabase/migrations/drop_friends_table.sql
```

**Откат:**
Если нужно восстановить таблицу `friends`, выполните миграцию `migrate_friends_to_follows.sql` заново (она создаст таблицу, если её нет).

---

### 8. `add_subscriptions_system.sql` ✨ НОВАЯ

Создает полную систему подписок с интеграцией NowPayments.

**Что делает:**

1. **Удаляет старую таблицу `subscriptions`**
   - Старая структура заменяется новой

2. **Создает таблицу `plans`**
   - Планы подписки (monthly, yearly)
   - Поля: `id`, `code`, `price`, `currency`, `interval_days`, `is_active`, `created_at`, `updated_at`

3. **Создает таблицу `payments`**
   - Платежи через NowPayments и другие провайдеры
   - Основные поля: `id`, `user_id`, `provider`, `provider_payment_id`, `tx_hash`, `amount`, `currency`, `status`, `created_at`, `confirmed_at`
   - Дополнительные поля для NowPayments: `parent_payment_id`, `purchase_id`, `pay_address`, `pay_amount`, `pay_currency`, `price_amount`, `price_currency`, `outcome_amount`, `outcome_currency`
   - Статусы: `pending`, `waiting`, `confirming`, `confirmed`, `finished`, `failed`, `refunded`, `expired`

4. **Создает таблицу `subscriptions`**
   - Активные подписки пользователей
   - Поля: `id`, `user_id`, `plan_id`, `status`, `current_period_end`, `created_at`, `updated_at`, `last_payment_id`
   - Статусы: `active`, `expired`, `cancelled`, `pending`

5. **Автоматическое обновление `subscription_tier`**
   - Триггер автоматически обновляет `subscription_tier` в таблице `profiles` на основе активных подписок
   - Если есть активная подписка → `vip`, иначе → `free`

6. **RLS политики**
   - Планы видны всем, редактирование только админам
   - Пользователи видят только свои платежи и подписки
   - Админы видят все платежи и подписки

**Применение:**

```bash
# 1. Примените миграцию через Supabase SQL Editor
# Файл: supabase/migrations/add_subscriptions_system.sql

# 2. Заполните начальные планы подписки
# Файл: supabase/migrations/seed_subscription_plans.sql
```

**Интеграция с NowPayments:**
- Поле `provider_payment_id` хранит `payment_id` из NowPayments API
- Поле `tx_hash` хранит hash транзакции блокчейна
- Поддержка всех статусов платежей NowPayments
- Дополнительные поля для полной интеграции (pay_address, pay_amount, outcome_amount и т.д.)

---

### 9. `seed_subscription_plans.sql` ✨ НОВАЯ

Заполняет таблицу `plans` начальными планами подписки.

**Что делает:**
- Вставляет планы: `monthly` (9.99 USD, 30 дней) и `yearly` (99.99 USD, 365 дней)
- Использует `ON CONFLICT DO UPDATE` для безопасного повторного выполнения

**Применение:**

```bash
# Выполните после add_subscriptions_system.sql
# Файл: supabase/migrations/seed_subscription_plans.sql
```

---

## Порядок применения миграций

Если вы настраиваете проект с нуля:

1. `schema.sql` - базовая схема
2. `add_invites_and_referrals.sql` - система инвайтов (обновлена для follows)
3. `add_twitter_handle_index.sql` - индекс Twitter handle
4. `add_countries_and_location_fields.sql` - страны и локация (создает таблицу)
5. `seed_countries.sql` - заполнение таблицы countries (249 стран)
6. `migrate_friends_to_follows.sql` - миграция на систему подписок (Instagram/Twitter модель)
7. `drop_friends_table.sql` - удаление устаревшей таблицы friends (опционально, только после проверки)
8. `add_subscriptions_system.sql` - система подписок с интеграцией NowPayments
9. `seed_subscription_plans.sql` - заполнение начальных планов подписки

## Проверка статуса миграций

Проверьте, какие таблицы и индексы уже существуют:

```sql
-- Список таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Список индексов
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public';

-- Проверка существования таблицы countries
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'countries'
);

-- Проверка существования поля country_code
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'country_code'
);
```

## Rollback миграций

Каждая миграция имеет инструкции по rollback в соответствующем файле или в документации.

Для rollback последней миграции (countries):

```sql
-- См. раздел "Rollback" в notes/countries-migration-guide.md
```

## Поддержка

Если возникли проблемы с миграциями:

1. Проверьте логи в Supabase Dashboard → Database → Logs
2. Убедитесь, что все зависимости выполнены (предыдущие миграции)
3. Проверьте синтаксис SQL
4. Обратитесь к документации в `notes/`

