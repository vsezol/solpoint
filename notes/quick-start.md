# ⚡ Быстрый старт интеграции

## 🚀 Шаг 1: Настройка Supabase (30 минут)

### 1.1 Создать проект в Supabase
```bash
# Перейти на https://supabase.com
# Создать новый проект
# Записать URL и ANON KEY
```

### 1.2 Выполнить SQL миграцию
```bash
# Открыть Supabase Dashboard -> SQL Editor
# Скопировать содержимое supabase/schema.sql
# Выполнить SQL скрипт
# Проверить, что таблицы созданы
```

### 1.3 Настроить переменные окружения
```bash
# Создать файл .env.local в корне проекта
touch .env.local
```

```env
# Добавить в .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 1.4 Проверить подключение
```typescript
// Создать тестовый файл test-connection.ts
import { createClient } from '@/lib/supabase/client';

async function testConnection() {
  const supabase = createClient();
  const { data, error } = await supabase.from('profiles').select('count');
  console.log('Connection test:', { data, error });
}

testConnection();
```

---

## 🔐 Шаг 2: Twitter OAuth (1 час)

### 2.1 Создать Twitter App
```
1. Перейти на https://developer.twitter.com
2. Создать новый App
3. Записать API Key и API Secret
4. Настроить Callback URLs:
   - http://localhost:3000/auth/callback
   - https://your-project.supabase.co/auth/v1/callback
```

### 2.2 Настроить в Supabase
```
1. Supabase Dashboard -> Authentication -> Providers
2. Включить Twitter
3. Ввести API Key и API Secret
4. Сохранить
```

### 2.3 Создать Auth Context
```bash
# Создать папку contexts
mkdir -p src/contexts

# Скопировать код из notes/api-examples.md
# Раздел "Auth Context"
```

### 2.4 Обернуть приложение в AuthProvider
```typescript
// src/app/layout.tsx
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## 📁 Шаг 3: Создать структуру API (15 минут)

```bash
# Создать папку api
mkdir -p src/lib/api

# Создать файлы
touch src/lib/api/profiles.ts
touch src/lib/api/events.ts
touch src/lib/api/hubs.ts
touch src/lib/api/map.ts
touch src/lib/api/messages.ts
touch src/lib/api/subscriptions.ts
touch src/lib/api/friends.ts
```

---

## 👤 Шаг 4: Интеграция Profile Page (2 часа)

### 4.1 Скопировать код API
```bash
# Открыть notes/api-examples.md
# Скопировать раздел "Profiles API" в src/lib/api/profiles.ts
```

### 4.2 Обновить Profile Page
```typescript
// src/app/profile/page.tsx

import { useAuth } from '@/contexts/AuthContext';
import { getCurrentUser, getUserFriends } from '@/lib/api/profiles';
import { getUserEvents } from '@/lib/api/events';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [friends, setFriends] = useState([]);
  const [events, setEvents] = useState({ upcoming: [], past: [] });
  
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);
  
  async function loadData() {
    // Загрузить друзей
    const friendsData = await getUserFriends(user.id);
    setFriends(friendsData);
    
    // Загрузить события
    const eventsData = await getUserEvents(user.id);
    setEvents(eventsData);
  }
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;
  
  return (
    // Остальной код остается прежним
    // Просто используем user из useAuth() вместо mockUsers[0]
    // И friends/events из state вместо моков
  );
}
```

### 4.3 Удалить импорт моковых данных
```typescript
// УДАЛИТЬ:
// import { mockUsers, mockEvents } from "@/lib/mock-data";

// УДАЛИТЬ:
// const user = mockUsers[0];
// const mutualFriends = mockUsers.slice(1, 4);

// ИСПОЛЬЗОВАТЬ:
// const { user } = useAuth();
// const [friends, setFriends] = useState([]);
```

---

## 📅 Шаг 5: Интеграция Events Page (2 часа)

### 5.1 Скопировать код API
```bash
# Открыть notes/api-examples.md
# Скопировать раздел "Events API" в src/lib/api/events.ts
```

### 5.2 Обновить Events Page
```typescript
// src/app/events/page.tsx

import { useAuth } from '@/contexts/AuthContext';
import { getEvents } from '@/lib/api/events';

export default function EventsPage() {
  const { isVip } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState(null);
  
  useEffect(() => {
    loadEvents();
  }, [searchQuery, selectedType]);
  
  async function loadEvents() {
    setLoading(true);
    const data = await getEvents({
      search: searchQuery,
      type: selectedType,
    });
    setEvents(data);
    setLoading(false);
  }
  
  // Разделение на upcoming/past остается таким же
  const now = new Date();
  const upcomingEvents = events.filter(
    (e) => new Date(e.start_date) >= now
  );
  const pastEvents = events.filter(
    (e) => new Date(e.start_date) < now
  );
  
  return (
    // Остальной код остается прежним
  );
}
```

### 5.3 Удалить импорт моковых данных
```typescript
// УДАЛИТЬ:
// import { mockEvents } from "@/lib/mock-data";

// УДАЛИТЬ:
// const filteredEvents = mockEvents.filter(...)

// ИСПОЛЬЗОВАТЬ:
// const [events, setEvents] = useState([]);
// useEffect(() => { loadEvents() }, []);
```

---

## 🏢 Шаг 6: Интеграция Hubs Page (1 час)

### 6.1 Скопировать код API
```bash
# Открыть notes/api-examples.md
# Скопировать раздел "Hubs API" в src/lib/api/hubs.ts
```

### 6.2 Обновить Hubs Page
```typescript
// src/app/hubs/page.tsx

import { getHubs, getHubsStats } from '@/lib/api/hubs';

export default function HubsPage() {
  const [hubs, setHubs] = useState([]);
  const [stats, setStats] = useState({ totalMembers: 0, totalCountries: 0 });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadHubs();
  }, []);
  
  async function loadHubs() {
    setLoading(true);
    const hubsData = await getHubs();
    const statsData = await getHubsStats();
    setHubs(hubsData);
    setStats(statsData);
    setLoading(false);
  }
  
  return (
    // Остальной код остается прежним
    // Использовать stats.totalMembers и stats.totalCountries
  );
}
```

---

## 🗺️ Шаг 7: Интеграция Map Page (2 часа)

### 7.1 Скопировать код API
```bash
# Открыть notes/api-examples.md
# Скопировать раздел "Map API" в src/lib/api/map.ts
```

### 7.2 Обновить Map Page
```typescript
// src/app/map/page.tsx

import { getMapMarkers } from '@/lib/api/map';

export default function MapPage() {
  const [markers, setMarkers] = useState([]);
  const [filters, setFilters] = useState({
    showUsers: true,
    showEvents: true,
    showHubs: true,
  });
  
  useEffect(() => {
    loadMarkers();
  }, [filters]);
  
  async function loadMarkers() {
    const data = await getMapMarkers(filters);
    setMarkers(data);
  }
  
  return (
    // Остальной код остается прежним
  );
}
```

### 7.3 Удалить импорт моковых данных
```typescript
// УДАЛИТЬ:
// import { getMockMarkers } from "@/lib/mock-data";

// УДАЛИТЬ:
// const allMarkers = getMockMarkers();

// ИСПОЛЬЗОВАТЬ:
// const data = await getMapMarkers(filters);
```

---

## ✅ Шаг 8: Проверка (30 минут)

### Чеклист проверки:

```bash
# 1. Запустить dev сервер
npm run dev

# 2. Открыть http://localhost:3000

# 3. Проверить страницы:
□ / - Landing Page загружается
□ /login - Кнопка Sign in with Twitter работает
□ /profile - После логина показывает реальный профиль
□ /events - Показывает события из БД
□ /hubs - Показывает хабы из БД
□ /map - Карта с реальными маркерами

# 4. Проверить функционал:
□ Twitter OAuth работает
□ Профиль загружается после логина
□ События фильтруются
□ Поиск работает
□ Карта показывает маркеры
```

---

## 🧹 Шаг 9: Очистка (15 минут)

### Удалить моковые данные из кода:

```bash
# Найти все использования
grep -r "mockUsers" src/
grep -r "mockEvents" src/
grep -r "mockHubs" src/
grep -r "getMockMarkers" src/
grep -r 'from "@/lib/mock-data"' src/

# После замены на API можно удалить или закомментировать
# src/lib/mock-data.ts (оставить для тестов)
```

---

## 📊 Опционально: Seed данные

### Импортировать моковые данные в Supabase:

```sql
-- В Supabase SQL Editor:

-- Импорт пользователей (пример)
INSERT INTO public.profiles (
  id, twitter_id, twitter_handle, twitter_name,
  country, city, role, subscription_tier, is_verified
) VALUES
  (gen_random_uuid(), '123456789', 'solana_alex', 'Alex Scott',
   'Argentina', 'Buenos Aires', 'trader', 'vip', true);

-- Импорт событий (пример)
INSERT INTO public.events (
  name, description, country, city,
  latitude, longitude, start_date, event_type,
  visibility, is_paid, price_sol
) VALUES
  ('Breakpoint 2025', 'Premier Solana conference',
   'UAE', 'Abu Dhabi', 24.4539, 54.3773,
   '2025-12-11', 'official', 'public', true, 2);

-- Аналогично для хабов
```

---

## 🔧 Полезные команды

### Development:
```bash
# Запустить dev сервер
npm run dev

# Проверить типы
npm run type-check

# Форматирование
npm run format

# Linting
npm run lint
```

### Supabase:
```bash
# Установить Supabase CLI (опционально)
npm install -g supabase

# Логин
supabase login

# Связать проект
supabase link --project-ref your-project-ref

# Pull remote changes
supabase db pull
```

---

## 🐛 Решение проблем

### Проблема: "Invalid JWT"
```bash
# Проверить .env.local
# Убедиться, что NEXT_PUBLIC_SUPABASE_ANON_KEY правильный
# Перезапустить dev сервер
```

### Проблема: "RLS policy violation"
```sql
-- Проверить политики в Supabase Dashboard
-- Authentication -> Policies
-- Убедиться, что политики применены
```

### Проблема: "CORS error"
```bash
# В Supabase Dashboard -> Settings -> API
# Добавить http://localhost:3000 в allowed origins
```

### Проблема: Моковые данные все еще показываются
```bash
# Убедиться, что импорты удалены:
grep -r "mock-data" src/app/

# Очистить кеш:
rm -rf .next
npm run dev
```

---

## 📚 Полезные ссылки

### Документация:
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [Twitter OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-twitter)
- [Next.js App Router](https://nextjs.org/docs/app)

### Ресурсы проекта:
- `notes/backend-integration-roadmap.md` - Полный roadmap
- `notes/integration-checklist.md` - Детальный чеклист
- `notes/current-architecture.md` - Текущая архитектура
- `notes/api-examples.md` - Примеры кода API

---

## ⏱️ Оценка времени

| Этап | Время |
|------|-------|
| Настройка Supabase | 30 мин |
| Twitter OAuth | 1 час |
| Auth Context | 30 мин |
| Profile API + Page | 2 часа |
| Events API + Page | 2 часа |
| Hubs API + Page | 1 час |
| Map API + Page | 2 часа |
| Тестирование | 1 час |
| Очистка | 30 мин |
| **ИТОГО** | **~11 часов** |

---

## 🎯 Следующие шаги после базовой интеграции

1. **VIP функции** (Wallet + Subscriptions) - 3-4 часа
2. **Messages** (Real-time чат) - 3-4 часа
3. **Friends система** - 2-3 часа
4. **Оптимизация** (React Query, caching) - 2-3 часа
5. **Error handling** - 1-2 часа
6. **Testing** - 3-4 часа

---

**Дата создания:** 13 декабря 2025  
**Последнее обновление:** 13 декабря 2025  
**Статус:** ✅ Готов к использованию

---

## 💡 Совет

Начните с **Шага 1-4** (Supabase + Auth + Profile). Это создаст базу для остальной интеграции. После того, как профиль работает с реальными данными, остальное пойдет намного быстрее! 🚀


