# 💻 Примеры API функций для интеграции

## 📁 Структура API папки

```
src/lib/api/
├── profiles.ts       # API для работы с профилями пользователей
├── events.ts         # API для работы с событиями
├── hubs.ts          # API для работы с хабами
├── map.ts           # API для работы с картой
├── messages.ts      # API для сообщений (VIP)
├── subscriptions.ts # API для подписок
└── friends.ts       # API для друзей
```

---

## 1️⃣ Profiles API (`src/lib/api/profiles.ts`)

### Пример реализации:

```typescript
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types';

/**
 * Получить текущего авторизованного пользователя
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  
  // Получить auth пользователя
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !authUser) {
    console.error('Auth error:', authError);
    return null;
  }
  
  // Получить профиль из таблицы profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();
  
  if (profileError) {
    console.error('Profile error:', profileError);
    return null;
  }
  
  return profile;
}

/**
 * Получить пользователя по ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Get user error:', error);
    return null;
  }
  
  return data;
}

/**
 * Обновить профиль текущего пользователя
 */
export async function updateProfile(updates: Partial<User>): Promise<User | null> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();
  
  if (error) {
    console.error('Update profile error:', error);
    throw error;
  }
  
  return data;
}

/**
 * Получить друзей пользователя
 */
export async function getUserFriends(userId: string): Promise<User[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('friends')
    .select(`
      friend:profiles!friends_friend_id_fkey (*)
    `)
    .eq('user_id', userId)
    .eq('status', 'accepted');
  
  if (error) {
    console.error('Get friends error:', error);
    return [];
  }
  
  return data.map(item => item.friend);
}

/**
 * Подключить Solana кошелек
 */
export async function connectWallet(walletAddress: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { error } = await supabase
    .from('profiles')
    .update({ wallet_address: walletAddress })
    .eq('id', user.id);
  
  if (error) {
    console.error('Connect wallet error:', error);
    return false;
  }
  
  return true;
}

/**
 * Поиск пользователей
 */
export async function searchUsers(query: string, limit = 20): Promise<User[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`twitter_name.ilike.%${query}%,twitter_handle.ilike.%${query}%`)
    .limit(limit);
  
  if (error) {
    console.error('Search users error:', error);
    return [];
  }
  
  return data;
}
```

---

## 2️⃣ Events API (`src/lib/api/events.ts`)

### Пример реализации:

```typescript
import { createClient } from '@/lib/supabase/client';
import type { Event } from '@/types';

interface EventFilters {
  search?: string;
  type?: string;
  country?: string;
  city?: string;
  upcomingOnly?: boolean;
}

/**
 * Получить события с фильтрацией
 */
export async function getEvents(filters: EventFilters = {}): Promise<Event[]> {
  const supabase = createClient();
  
  // Проверить VIP статус текущего пользователя
  const { data: { user } } = await supabase.auth.getUser();
  let isVip = false;
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    
    isVip = profile?.subscription_tier === 'vip';
  }
  
  let query = supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: true });
  
  // Применить RLS: показывать только публичные события для non-VIP
  if (!isVip) {
    query = query.eq('visibility', 'public');
  }
  
  // Фильтр по поиску
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,city.ilike.%${filters.search}%,country.ilike.%${filters.search}%`);
  }
  
  // Фильтр по типу
  if (filters.type) {
    query = query.eq('event_type', filters.type);
  }
  
  // Фильтр по стране
  if (filters.country) {
    query = query.eq('country', filters.country);
  }
  
  // Фильтр по городу
  if (filters.city) {
    query = query.eq('city', filters.city);
  }
  
  // Только предстоящие события
  if (filters.upcomingOnly) {
    query = query.gte('start_date', new Date().toISOString());
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Get events error:', error);
    return [];
  }
  
  return data;
}

/**
 * Получить событие по ID
 */
export async function getEventById(eventId: string): Promise<Event | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();
  
  if (error) {
    console.error('Get event error:', error);
    return null;
  }
  
  return data;
}

/**
 * Создать новое событие
 */
export async function createEvent(eventData: Partial<Event>): Promise<Event | null> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { data, error } = await supabase
    .from('events')
    .insert({
      ...eventData,
      organizer_id: user.id,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Create event error:', error);
    throw error;
  }
  
  return data;
}

/**
 * Зарегистрироваться на событие
 */
export async function registerForEvent(eventId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { error } = await supabase
    .from('event_attendees')
    .insert({
      event_id: eventId,
      user_id: user.id,
    });
  
  if (error) {
    console.error('Register for event error:', error);
    return false;
  }
  
  return true;
}

/**
 * Отменить регистрацию на событие
 */
export async function unregisterFromEvent(eventId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { error } = await supabase
    .from('event_attendees')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', user.id);
  
  if (error) {
    console.error('Unregister from event error:', error);
    return false;
  }
  
  return true;
}

/**
 * Получить события пользователя
 */
export async function getUserEvents(userId: string): Promise<{
  upcoming: Event[];
  past: Event[];
}> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('event_attendees')
    .select(`
      event:events (*)
    `)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Get user events error:', error);
    return { upcoming: [], past: [] };
  }
  
  const events = data.map(item => item.event);
  const now = new Date();
  
  const upcoming = events.filter(e => new Date(e.start_date) >= now);
  const past = events.filter(e => new Date(e.start_date) < now);
  
  return { upcoming, past };
}

/**
 * Проверить, зарегистрирован ли пользователь на событие
 */
export async function isRegisteredForEvent(eventId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;
  
  const { data, error } = await supabase
    .from('event_attendees')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single();
  
  return !!data && !error;
}
```

---

## 3️⃣ Hubs API (`src/lib/api/hubs.ts`)

### Пример реализации:

```typescript
import { createClient } from '@/lib/supabase/client';
import type { Hub } from '@/types';

interface HubFilters {
  search?: string;
  country?: string;
}

/**
 * Получить хабы с фильтрацией
 */
export async function getHubs(filters: HubFilters = {}): Promise<Hub[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('hubs')
    .select('*')
    .order('members_count', { ascending: false });
  
  // Фильтр по поиску
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,country.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
  }
  
  // Фильтр по стране
  if (filters.country) {
    query = query.eq('country', filters.country);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Get hubs error:', error);
    return [];
  }
  
  return data;
}

/**
 * Получить хаб по ID
 */
export async function getHubById(hubId: string): Promise<Hub | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('hubs')
    .select('*')
    .eq('id', hubId)
    .single();
  
  if (error) {
    console.error('Get hub error:', error);
    return null;
  }
  
  return data;
}

/**
 * Вступить в хаб
 */
export async function joinHub(hubId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { error } = await supabase
    .from('hub_members')
    .insert({
      hub_id: hubId,
      user_id: user.id,
    });
  
  if (error) {
    console.error('Join hub error:', error);
    return false;
  }
  
  return true;
}

/**
 * Покинуть хаб
 */
export async function leaveHub(hubId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  const { error } = await supabase
    .from('hub_members')
    .delete()
    .eq('hub_id', hubId)
    .eq('user_id', user.id);
  
  if (error) {
    console.error('Leave hub error:', error);
    return false;
  }
  
  return true;
}

/**
 * Проверить, состоит ли пользователь в хабе
 */
export async function isMemberOfHub(hubId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;
  
  const { data, error } = await supabase
    .from('hub_members')
    .select('id')
    .eq('hub_id', hubId)
    .eq('user_id', user.id)
    .single();
  
  return !!data && !error;
}

/**
 * Получить участников хаба
 */
export async function getHubMembers(hubId: string, limit = 50): Promise<User[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('hub_members')
    .select(`
      member:profiles (*)
    `)
    .eq('hub_id', hubId)
    .limit(limit);
  
  if (error) {
    console.error('Get hub members error:', error);
    return [];
  }
  
  return data.map(item => item.member);
}

/**
 * Получить статистику по хабам
 */
export async function getHubsStats() {
  const supabase = createClient();
  
  const { data: hubs } = await supabase
    .from('hubs')
    .select('members_count, country');
  
  if (!hubs) {
    return { totalMembers: 0, totalCountries: 0 };
  }
  
  const totalMembers = hubs.reduce((acc, hub) => acc + hub.members_count, 0);
  const totalCountries = new Set(hubs.map(hub => hub.country)).size;
  
  return { totalMembers, totalCountries };
}
```

---

## 4️⃣ Map API (`src/lib/api/map.ts`)

### Пример реализации:

```typescript
import { createClient } from '@/lib/supabase/client';
import type { MapMarker, MapFilters } from '@/types';

/**
 * Получить все маркеры для карты
 */
export async function getMapMarkers(filters?: MapFilters): Promise<MapMarker[]> {
  const supabase = createClient();
  const markers: MapMarker[] = [];
  
  // Получить пользователей
  if (filters?.showUsers !== false) {
    let userQuery = supabase
      .from('profiles')
      .select('*');
    
    // Фильтр по ролям
    if (filters?.userRoles && filters.userRoles.length > 0) {
      userQuery = userQuery.in('role', filters.userRoles);
    }
    
    // Фильтр "Open to meet"
    if (filters?.openToMeet) {
      userQuery = userQuery.eq('is_open_to_meet', true);
    }
    
    // Фильтр "Active only"
    if (filters?.activeOnly) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      userQuery = userQuery.gte('last_active_at', thirtyDaysAgo.toISOString());
    }
    
    // Фильтр по стране
    if (filters?.country) {
      userQuery = userQuery.eq('country', filters.country);
    }
    
    // Фильтр по городу
    if (filters?.city) {
      userQuery = userQuery.eq('city', filters.city);
    }
    
    const { data: users } = await userQuery;
    
    if (users) {
      // Нужно добавить lat/lng в схему profiles или использовать геокодинг
      users.forEach(user => {
        markers.push({
          id: `user-${user.id}`,
          type: user.subscription_tier === 'vip' ? 'vip_user' : 'user',
          latitude: user.latitude || 0, // Нужно добавить в схему
          longitude: user.longitude || 0, // Нужно добавить в схему
          data: user,
        });
      });
    }
  }
  
  // Получить события
  if (filters?.showEvents !== false) {
    let eventQuery = supabase
      .from('events')
      .select('*')
      .gte('start_date', new Date().toISOString()); // Только предстоящие
    
    // Фильтр по стране
    if (filters?.country) {
      eventQuery = eventQuery.eq('country', filters.country);
    }
    
    // Фильтр по городу
    if (filters?.city) {
      eventQuery = eventQuery.eq('city', filters.city);
    }
    
    const { data: events } = await eventQuery;
    
    if (events) {
      events.forEach(event => {
        markers.push({
          id: `event-${event.id}`,
          type: 'event',
          latitude: event.latitude,
          longitude: event.longitude,
          data: event,
        });
      });
    }
  }
  
  // Получить хабы
  if (filters?.showHubs !== false) {
    let hubQuery = supabase
      .from('hubs')
      .select('*');
    
    // Фильтр по стране
    if (filters?.country) {
      hubQuery = hubQuery.eq('country', filters.country);
    }
    
    // Фильтр по городу
    if (filters?.city) {
      hubQuery = hubQuery.eq('city', filters.city);
    }
    
    const { data: hubs } = await hubQuery;
    
    if (hubs) {
      hubs.forEach(hub => {
        markers.push({
          id: `hub-${hub.id}`,
          type: 'hub',
          latitude: hub.latitude,
          longitude: hub.longitude,
          data: hub,
        });
      });
    }
  }
  
  return markers;
}

/**
 * Получить маркеры в пределах области просмотра (для оптимизации)
 */
export async function getMarkersByBounds(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): Promise<MapMarker[]> {
  const supabase = createClient();
  const markers: MapMarker[] = [];
  
  // События в пределах bounds
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .gte('latitude', bounds.south)
    .lte('latitude', bounds.north)
    .gte('longitude', bounds.west)
    .lte('longitude', bounds.east);
  
  if (events) {
    events.forEach(event => {
      markers.push({
        id: `event-${event.id}`,
        type: 'event',
        latitude: event.latitude,
        longitude: event.longitude,
        data: event,
      });
    });
  }
  
  // Хабы в пределах bounds
  const { data: hubs } = await supabase
    .from('hubs')
    .select('*')
    .gte('latitude', bounds.south)
    .lte('latitude', bounds.north)
    .gte('longitude', bounds.west)
    .lte('longitude', bounds.east);
  
  if (hubs) {
    hubs.forEach(hub => {
      markers.push({
        id: `hub-${hub.id}`,
        type: 'hub',
        latitude: hub.latitude,
        longitude: hub.longitude,
        data: hub,
      });
    });
  }
  
  return markers;
}
```

---

## 5️⃣ Auth Context (`src/contexts/AuthContext.tsx`)

### Пример реализации:

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  authUser: SupabaseUser | null;
  loading: boolean;
  isVip: boolean;
  signInWithTwitter: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  
  // Загрузить пользователя
  const loadUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        setAuthUser(authUser);
        
        // Получить профиль
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        setUser(profile);
      } else {
        setAuthUser(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Load user error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Инициализация
  useEffect(() => {
    loadUser();
    
    // Подписаться на изменения auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await loadUser();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setAuthUser(null);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Вход через Twitter
  const signInWithTwitter = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };
  
  // Выход
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAuthUser(null);
  };
  
  // Обновить данные пользователя
  const refreshUser = async () => {
    await loadUser();
  };
  
  const isVip = user?.subscription_tier === 'vip';
  
  return (
    <AuthContext.Provider
      value={{
        user,
        authUser,
        loading,
        isVip,
        signInWithTwitter,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook для использования auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
}
```

### Использование в `layout.tsx`:

```typescript
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Использование в компонентах:

```typescript
import { useAuth } from '@/contexts/AuthContext';

function ProfilePage() {
  const { user, loading, isVip, signOut } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <div>Please log in</div>;
  }
  
  return (
    <div>
      <h1>{user.twitter_name}</h1>
      {isVip && <Badge>VIP</Badge>}
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

---

## 📝 Примечания

### ⚠️ Важно добавить в schema.sql:

```sql
-- Добавить latitude и longitude для пользователей (если нужно)
ALTER TABLE public.profiles 
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION;
```

### 🔧 Environment Variables (.env.local):

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 📦 Дополнительные пакеты:

```bash
npm install @tanstack/react-query  # Для кеширования запросов (опционально)
npm install zustand                 # Для state management (опционально)
```

---

**Дата создания:** 13 декабря 2025  
**Статус:** 📝 Готовые примеры кода


