# 🏗️ Текущая архитектура проекта SolPoint

## 📐 Структура зависимостей моковых данных

```
src/lib/mock-data.ts
├── mockUsers (5 пользователей)
├── mockEvents (4 события)
├── mockHubs (4 хаба)
├── createMapMarkers()
└── getMockMarkers()
       │
       ├─────────────────────────────────┐
       │                                 │
       ▼                                 ▼
src/app/profile/page.tsx          src/app/map/page.tsx
├── mockUsers[0] (current user)   ├── getMockMarkers()
├── mockUsers.slice(1,4) (friends)└── Фильтры маркеров
└── mockEvents (upcoming/past)
       │
       │
       ▼
src/app/events/page.tsx
├── mockEvents
├── Поиск
├── Фильтры по типу
└── VIP visibility
       │
       │
       ▼
src/app/hubs/page.tsx
├── mockHubs
├── Поиск
└── Статистика
```

---

## 🗂️ Детальная карта использования данных

### 1️⃣ Profile Page (`src/app/profile/page.tsx`)

#### Импорты моковых данных:
```typescript
import { mockUsers, mockEvents } from "@/lib/mock-data";
```

#### Использование в коде:
```typescript
// Строка 27: Текущий пользователь
const user = mockUsers[0];

// Строки 28-33: События пользователя
const upcomingEvents = mockEvents.filter(
  (e) => new Date(e.start_date) > new Date()
);
const pastEvents = mockEvents.filter(
  (e) => new Date(e.start_date) <= new Date()
);

// Строка 36: Друзья
const mutualFriends = mockUsers.slice(1, 4);
```

#### Что отображается:
- **Профиль:** avatar, name, handle, bio, location, role
- **Статус:** VIP badge, verification badge
- **Друзья:** 3 mutual friends с аватарами
- **События:** upcoming (будущие) и past (прошедшие)
- **Socials:** Twitter, Instagram, Facebook links
- **Wallet:** кнопка Connect Wallet (пока не функциональна)

#### Зависимые компоненты:
- `<Avatar />` - UI компонент
- `<Badge />` - UI компонент
- `<Card />` - UI компонент

---

### 2️⃣ Events Page (`src/app/events/page.tsx`)

#### Импорты моковых данных:
```typescript
import { mockEvents } from "@/lib/mock-data";
```

#### Использование в коде:
```typescript
// Строки 24-43: Фильтрация событий
const filteredEvents = mockEvents.filter((event) => {
  // Поиск по названию, городу, стране
  if (searchQuery) { ... }
  
  // Фильтр по типу события
  if (selectedType && event.event_type !== selectedType) { ... }
  
  // Скрытие VIP событий для free пользователей
  if (!isVip && event.visibility === "vip_only") { ... }
  
  return true;
});

// Строки 47-50: Разделение на upcoming/past
const upcomingEvents = filteredEvents.filter(
  (e) => new Date(e.start_date) >= now
);
const pastEvents = filteredEvents.filter(
  (e) => new Date(e.start_date) < now
);
```

#### Что отображается:
- **Заголовок:** "Solana Events"
- **Поиск:** Input с иконкой Search
- **Фильтры:** All, Official, Community, Meetup, Private
- **Upcoming Events:** Карточки предстоящих событий
- **Past Events:** Карточки прошедших событий (с opacity)

#### Зависимые компоненты:
- `<EventCard />` - карточка события
- `<Input />` - UI компонент
- `<Badge />` - UI компонент

---

### 3️⃣ Hubs Page (`src/app/hubs/page.tsx`)

#### Импорты моковых данных:
```typescript
import { mockHubs } from "@/lib/mock-data";
```

#### Использование в коде:
```typescript
// Строки 14-26: Фильтрация хабов
const filteredHubs = mockHubs.filter((hub) => {
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    if (!hub.name.toLowerCase().includes(query) &&
        !hub.country.toLowerCase().includes(query) &&
        !(hub.city?.toLowerCase().includes(query))) {
      return false;
    }
  }
  return true;
});

// Строки 29-30: Статистика
const totalMembers = mockHubs.reduce((acc, hub) => acc + hub.members_count, 0);
const totalCountries = new Set(mockHubs.map((hub) => hub.country)).size;
```

#### Что отображается:
- **Заголовок:** "Solana Hubs"
- **Статистика:** Total Members, Countries
- **Поиск:** Input для поиска по названию/стране
- **Хабы Grid:** Карточки хабов с информацией

#### Зависимые компоненты:
- `<HubCard />` - карточка хаба
- `<Input />` - UI компонент

---

### 4️⃣ Map Page (`src/app/map/page.tsx`)

#### Импорты моковых данных:
```typescript
import { getMockMarkers } from "@/lib/mock-data";
```

#### Использование в коде:
```typescript
// Строки 35-39: Загрузка маркеров
useEffect(() => {
  const allMarkers = getMockMarkers();
  setMarkers(allMarkers);
}, []);

// Строки 42-53: Фильтрация маркеров
const filteredMarkers = markers.filter((marker) => {
  if (marker.type === "user" || marker.type === "vip_user") {
    if (!filters.showUsers) return false;
  }
  if (marker.type === "event") {
    if (!filters.showEvents) return false;
  }
  if (marker.type === "hub") {
    if (!filters.showHubs) return false;
  }
  return true;
});
```

#### Что отображается:
- **Заголовок:** "SolPoint Map"
- **Фильтры:** Sidebar с чекбоксами (Users, Events, Hubs)
- **Карта:** Leaflet карта с маркерами
- **Маркеры:** Разные типы для users, vip_users, events, hubs

#### Зависимые компоненты:
- `<SolPointMap />` - компонент карты (Leaflet)
- `<MapFiltersPanel />` - панель фильтров

#### Особенности:
- Dynamic import для избежания SSR проблем с Leaflet
- Center координаты: `[35, 55]` (примерно Middle East)
- Zoom level: `4`

---

### 5️⃣ Landing Page (`src/app/page.tsx`)

#### Импорты моковых данных:
```typescript
// НЕ ИСПОЛЬЗУЕТ моковые данные напрямую
```

#### Структура:
```typescript
<Header />
<HeroSection />
<AboutSection />
<TeamSection />
<Footer />
```

#### Потенциал для интеграции:
- Можно добавить секцию со статистикой (количество пользователей, событий)
- Показать ближайшие события
- Показать featured хабы

---

## 🧩 Компоненты карточек

### EventCard (`src/components/cards/event-card.tsx`)

**Props:**
```typescript
interface EventCardProps {
  event: Event;
  isVip: boolean;
}
```

**Отображает:**
- Название события
- Дата и время
- Локация (город, страна)
- Тип события (badge)
- Количество участников
- Цена (если платное)
- VIP badge (если visibility === "vip_only")
- Социальные ссылки

---

### HubCard (`src/components/cards/hub-card.tsx`)

**Props:**
```typescript
interface HubCardProps {
  hub: Hub;
}
```

**Отображает:**
- Название хаба
- Описание
- Локация (город, страна)
- Количество участников
- Социальные ссылки

---

### UserCard (`src/components/cards/user-card.tsx`)

**Props:**
```typescript
interface UserCardProps {
  user: User;
  showActions?: boolean;
}
```

**Отображает:**
- Аватар с VIP/Verified badges
- Имя пользователя
- Twitter handle
- Локация
- Роль
- "Open to meet" badge
- Кнопки действий (опционально)

---

## 🗺️ Map компоненты

### SolPointMap (`src/components/map/solpoint-map.tsx`)

**Props:**
```typescript
interface SolPointMapProps {
  markers: MapMarker[];
  center: [number, number];
  zoom: number;
  isVip: boolean;
}
```

**Функционал:**
- Отображение Leaflet карты
- Рендер маркеров разных типов
- Попапы с информацией о маркерах
- Разные иконки для users, events, hubs
- Специальная иконка для VIP users

---

### MapFiltersPanel (`src/components/map/map-filters.tsx`)

**Props:**
```typescript
interface MapFiltersPanelProps {
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  isVip: boolean;
}
```

**Функционал:**
- Чекбоксы для включения/выключения типов маркеров
- Фильтры по ролям (потенциально)
- "Open to meet" фильтр
- "Active only" фильтр
- Геофильтры (country, city)

---

## 📊 Структура моковых данных

### mockUsers (5 пользователей)

```typescript
[
  {
    id: "1",
    twitter_handle: "solana_alex",
    twitter_name: "Alex Scott",
    country: "Argentina",
    city: "Buenos Aires",
    role: "trader",
    subscription_tier: "vip",
    is_verified: true,
    is_open_to_meet: true
  },
  {
    id: "2",
    twitter_handle: "cryptodev_eth",
    country: "Kazakhstan",
    city: "Almaty",
    role: "developer",
    subscription_tier: "free"
  },
  {
    id: "3",
    twitter_handle: "sol_investor",
    country: "UAE",
    city: "Dubai",
    role: "investor",
    subscription_tier: "vip",
    is_verified: true
  },
  {
    id: "4",
    twitter_handle: "degen_trader",
    country: "Turkey",
    city: "Istanbul",
    role: "degen",
    subscription_tier: "free"
  },
  {
    id: "5",
    twitter_handle: "sol_designer",
    country: "Thailand",
    city: "Bangkok",
    role: "designer",
    subscription_tier: "vip"
  }
]
```

### mockEvents (4 события)

```typescript
[
  {
    id: "e1",
    name: "Breakpoint 2025",
    country: "UAE",
    city: "Abu Dhabi",
    start_date: "2025-12-11",
    end_date: "2025-12-13",
    event_type: "official",
    visibility: "public",
    is_paid: true,
    price_sol: 2,
    max_attendees: 5000,
    attendees_count: 3200
  },
  {
    id: "e2",
    name: "Solana Hacker House Almaty",
    country: "Kazakhstan",
    city: "Almaty",
    start_date: "2025-03-15",
    event_type: "community",
    visibility: "public"
  },
  {
    id: "e3",
    name: "Istanbul Solana Meetup",
    country: "Turkey",
    city: "Istanbul",
    start_date: "2025-02-20",
    event_type: "meetup",
    visibility: "public"
  },
  {
    id: "e4",
    name: "VIP Networking Dinner",
    country: "UAE",
    city: "Dubai",
    start_date: "2025-02-28",
    event_type: "private",
    visibility: "vip_only", // ⚠️ Только для VIP
    is_paid: true,
    price_sol: 5,
    max_attendees: 30
  }
]
```

### mockHubs (4 хаба)

```typescript
[
  {
    id: "h1",
    name: "Superteam KZ",
    country: "Kazakhstan",
    city: "Almaty",
    members_count: 250
  },
  {
    id: "h2",
    name: "Superteam Turkey",
    country: "Turkey",
    members_count: 180
  },
  {
    id: "h3",
    name: "Superteam UAE",
    country: "UAE",
    city: "Dubai",
    members_count: 320
  },
  {
    id: "h4",
    name: "Superteam India",
    country: "India",
    city: "Bangalore",
    members_count: 850
  }
]
```

---

## 🔄 Функция createMapMarkers()

### Логика создания маркеров:

```typescript
createMapMarkers(users, events, hubs) {
  const markers = [];
  
  // 1. Маркеры пользователей
  users.forEach(user => {
    markers.push({
      id: `user-${user.id}`,
      type: user.subscription_tier === "vip" ? "vip_user" : "user",
      latitude: coords.lat + randomOffset,
      longitude: coords.lng + randomOffset,
      data: user
    });
  });
  
  // 2. Маркеры событий
  events.forEach(event => {
    markers.push({
      id: `event-${event.id}`,
      type: "event",
      latitude: event.latitude,
      longitude: event.longitude,
      data: event
    });
  });
  
  // 3. Маркеры хабов
  hubs.forEach(hub => {
    markers.push({
      id: `hub-${hub.id}`,
      type: "hub",
      latitude: hub.latitude,
      longitude: hub.longitude,
      data: hub
    });
  });
  
  return markers;
}
```

### Country Coordinates (hardcoded):
```typescript
{
  "Argentina": { lat: -34.6037, lng: -58.3816 },
  "Kazakhstan": { lat: 43.2566, lng: 76.9286 },
  "UAE": { lat: 25.2048, lng: 55.2708 },
  "Turkey": { lat: 41.0082, lng: 28.9784 },
  "Thailand": { lat: 13.7563, lng: 100.5018 },
  "India": { lat: 12.9716, lng: 77.5946 }
}
```

**Проблема:** Координаты пользователей генерируются с random offset, что не соответствует реальной геолокации.

**Решение при интеграции:** В БД хранить точные координаты пользователей или использовать геокодинг.

---

## 🔐 Страницы без интеграции (пока статичные)

### Login Page (`src/app/login/page.tsx`)
- Пока только UI
- Нужна интеграция с Supabase Auth

### Signup Page (`src/app/signup/page.tsx`)
- Пока только UI
- Нужна интеграция с Supabase Auth

### Subscription Page (`src/app/subscription/page.tsx`)
- Статичная информация о тарифах
- Нужна интеграция с Solana Wallet

### About Page (`src/app/about/page.tsx`)
- Полностью статичная
- Не требует интеграции

---

## 🎨 UI компоненты (не зависят от данных)

### Layout компоненты
- `<Header />` - навигация
- `<Footer />` - подвал

### UI компоненты
- `<Avatar />` - аватар с badges
- `<Badge />` - бейджи (VIP, Verified, и т.д.)
- `<Button />` - кнопки
- `<Card />` - карточки
- `<Input />` - поля ввода
- `<Modal />` - модальные окна

---

## 📈 Статистика использования моковых данных

### Количество файлов, использующих моки:
- ✅ **4 страницы** используют моки напрямую
- ✅ **3 компонента карточек** получают моки через props
- ✅ **2 map компонента** получают моки через props
- ✅ **1 файл** содержит все моки (`mock-data.ts`)

### Типы данных в использовании:
- **mockUsers:** Profile Page, Map Page (через getMockMarkers)
- **mockEvents:** Profile Page, Events Page, Map Page (через getMockMarkers)
- **mockHubs:** Hubs Page, Map Page (через getMockMarkers)

---

## 🎯 Следующие шаги для каждой страницы

### Profile Page
1. Создать `src/lib/api/profiles.ts`
2. Заменить `mockUsers[0]` на `getCurrentUser()`
3. Заменить `mockUsers.slice(1,4)` на `getUserFriends()`
4. Заменить `mockEvents` на `getUserEvents()`

### Events Page
1. Создать `src/lib/api/events.ts`
2. Заменить `mockEvents` на `getEvents()`
3. Добавить server-side filtering
4. Добавить функционал регистрации

### Hubs Page
1. Создать `src/lib/api/hubs.ts`
2. Заменить `mockHubs` на `getHubs()`
3. Добавить функционал "Join Hub"

### Map Page
1. Создать `src/lib/api/map.ts`
2. Заменить `getMockMarkers()` на `getMapMarkers()`
3. Оптимизировать загрузку маркеров

---

**Дата создания:** 13 декабря 2025  
**Последнее обновление:** 13 декабря 2025  
**Статус:** 📸 Snapshot текущего состояния


