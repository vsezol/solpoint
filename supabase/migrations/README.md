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

## Порядок применения миграций

Если вы настраиваете проект с нуля:

1. `schema.sql` - базовая схема
2. `add_invites_and_referrals.sql` - система инвайтов
3. `add_twitter_handle_index.sql` - индекс Twitter handle
4. `add_countries_and_location_fields.sql` - страны и локация (создает таблицу)
5. `seed_countries.sql` - заполнение таблицы countries (249 стран)

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

