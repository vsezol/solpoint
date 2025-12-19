# Руководство по миграции: Countries и Location Fields

## Обзор

Эта миграция добавляет:
1. Таблицу `countries` с ISO 3166-1 alpha-2 кодами стран
2. Поле `country_code` в таблице `profiles` (замена `country`)
3. Обновленное поле `city` с ограничением длины 150 символов
4. Индексы для оптимизации поиска

## Файлы миграции

- `supabase/migrations/add_countries_and_location_fields.sql`

## Изменения в схеме базы данных

### Новая таблица: `countries`

```sql
CREATE TABLE public.countries (
  code CHAR(2) PRIMARY KEY,          -- ISO 3166-1 alpha-2
  name TEXT NOT NULL                 -- Human-readable name
);
```

### Обновления таблицы `profiles`

**Новые поля:**
- `country_code` CHAR(2) NULL - ISO код страны (uppercase, 2 символа)

**Обновленные поля:**
- `country` TEXT NULL - помечено как DEPRECATED
- `city` TEXT NULL - добавлено ограничение max 150 символов

**Constraints:**
```sql
-- country_code должен быть uppercase
ALTER TABLE public.profiles
ADD CONSTRAINT check_country_code_uppercase 
  CHECK (country_code IS NULL OR country_code = UPPER(country_code));

-- country_code длина = 2
ALTER TABLE public.profiles
ADD CONSTRAINT check_country_code_length 
  CHECK (country_code IS NULL OR LENGTH(country_code) = 2);

-- Foreign key на таблицу countries
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_country_code 
  FOREIGN KEY (country_code) REFERENCES public.countries(code)
  ON DELETE SET NULL;

-- city max length 150
ALTER TABLE public.profiles
ADD CONSTRAINT check_city_length 
  CHECK (city IS NULL OR char_length(city) <= 150);
```

**Индексы:**
```sql
CREATE INDEX idx_profiles_country_code ON public.profiles(country_code);
CREATE INDEX idx_profiles_city ON public.profiles(city);
```

## Изменения в TypeScript типах

### Обновлен тип `User`

```typescript
export interface User {
  // ... другие поля
  country?: string; // @deprecated Use country_code instead
  country_code?: string; // ISO 3166-1 alpha-2 (e.g., "US", "RU")
  city?: string; // Max 150 characters
  // ... другие поля
}
```

### Новый тип `Country`

```typescript
export interface Country {
  code: string; // ISO 3166-1 alpha-2 (2 chars, uppercase)
  name: string; // Human-readable name
}
```

## Новые утилиты и компоненты

### `/src/lib/countries.ts`

Утилиты для работы со странами:

- `getCountries()` - получить все страны из БД
- `getCountryByCode(code)` - получить страну по коду
- `isValidCountryCode(code)` - валидация кода страны
- `normalizeCountryCode(code)` - приведение к uppercase
- `validateCity(city)` - валидация и нормализация города
- `COUNTRIES_STATIC` - статический список стран (fallback)

### `/src/components/ui/country-select.tsx`

React компонент для выбора страны:

```tsx
<CountrySelect
  value={countryCode}
  onChange={setCountryCode}
  placeholder="Select country"
/>
```

## API изменения

### `PATCH /api/profile/update`

Добавлена поддержка новых полей:

**Request body:**
```json
{
  "country_code": "US",  // ISO 3166-1 alpha-2, optional
  "city": "San Francisco"  // Max 150 chars, optional
}
```

**Валидация:**
- `country_code`: должен быть 2 символа, uppercase, существовать в таблице countries
- `city`: max 150 символов, nullable

## Миграция существующих данных

### Шаг 1: Запустите SQL миграцию

Выполните файл миграции в Supabase SQL Editor:

```bash
# Файл: supabase/migrations/add_countries_and_location_fields.sql
```

### Шаг 2: Мигрируйте данные из country в country_code

Если у вас есть данные в старом поле `country`, вам нужно создать mapping и обновить записи:

```sql
-- Пример миграции данных (адаптируйте под ваши данные)
UPDATE public.profiles
SET country_code = CASE
  WHEN country = 'United States' THEN 'US'
  WHEN country = 'Russia' THEN 'RU'
  WHEN country = 'Germany' THEN 'DE'
  -- ... добавьте другие страны
  ELSE NULL
END
WHERE country IS NOT NULL;
```

### Шаг 3: Проверьте данные

```sql
-- Проверьте, что все коды стран валидны
SELECT DISTINCT country_code, country
FROM public.profiles
WHERE country_code IS NOT NULL;

-- Проверьте записи без country_code
SELECT id, twitter_handle, country
FROM public.profiles
WHERE country IS NOT NULL AND country_code IS NULL;
```

### Шаг 4: (Опционально) Удалите старое поле country

После успешной миграции данных:

```sql
-- Создайте новую миграцию для удаления старого поля
ALTER TABLE public.profiles DROP COLUMN country;
```

## Обновление фронтенда

### Обновите формы профиля

Форма редактирования профиля уже обновлена в:
- `src/app/profile/profile-edit-form.tsx`

### Обновите отображение локации

Замените использование `user.country` на:

```tsx
// Старый код
<p>{user.country}</p>

// Новый код с country_code
<p>{user.country_code}</p>

// Или получите название страны
const country = await getCountryByCode(user.country_code);
<p>{country?.name}</p>
```

## Расширение списка стран

Чтобы добавить больше стран:

```sql
INSERT INTO public.countries (code, name) VALUES
  ('JP', 'Japan'),
  ('KR', 'South Korea'),
  -- ... другие страны
ON CONFLICT (code) DO NOTHING;
```

Также обновите `COUNTRIES_STATIC` в `src/lib/countries.ts`.

## Rollback

Если нужно откатить миграцию:

```sql
-- Удалить constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_country_code_uppercase;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_country_code_length;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS fk_profiles_country_code;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_city_length;

-- Удалить индексы
DROP INDEX IF EXISTS public.idx_profiles_country_code;
DROP INDEX IF EXISTS public.idx_profiles_city;

-- Удалить поле country_code
ALTER TABLE public.profiles DROP COLUMN IF EXISTS country_code;

-- Удалить таблицу countries
DROP TABLE IF EXISTS public.countries;

-- Восстановить старый индекс country (если был)
CREATE INDEX idx_profiles_country ON public.profiles(country);
```

## Проверка после миграции

1. ✅ Таблица `countries` создана и заполнена данными
2. ✅ Поле `country_code` добавлено в `profiles`
3. ✅ Все constraints работают корректно
4. ✅ Индексы созданы
5. ✅ View `country_stats` обновлен
6. ✅ Фронтенд компоненты обновлены
7. ✅ API endpoint поддерживает новые поля
8. ✅ TypeScript типы обновлены

## Примеры использования

### Backend: Получение стран

```typescript
import { getCountries, getCountryByCode } from "@/lib/countries";

// Получить все страны
const countries = await getCountries();

// Получить страну по коду
const usa = await getCountryByCode("US");
console.log(usa?.name); // "United States"
```

### Frontend: Форма с выбором страны

```tsx
import { CountrySelect } from "@/components/ui/country-select";

function ProfileForm() {
  const [countryCode, setCountryCode] = useState<string>();
  
  return (
    <CountrySelect
      value={countryCode}
      onChange={setCountryCode}
      placeholder="Выберите страну"
    />
  );
}
```

### API: Обновление профиля

```typescript
const response = await fetch("/api/profile/update", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    country_code: "RU",
    city: "Moscow"
  })
});
```


