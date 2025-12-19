# 🔄 Диаграмма потока данных

## Текущее состояние (Моковые данные)

```
┌─────────────────────────────────────────────────────┐
│         src/lib/mock-data.ts                        │
│                                                     │
│  • mockUsers (5 users)                             │
│  • mockEvents (4 events)                           │
│  • mockHubs (4 hubs)                               │
│  • getMockMarkers() → MapMarker[]                  │
│                                                     │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ import
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │Profile │ │Events  │ │ Hubs   │
   │ Page   │ │ Page   │ │ Page   │
   └────────┘ └────────┘ └────────┘
        │          │          │
        └──────────┼──────────┘
                   │
                   ▼
              ┌─────────┐
              │Map Page │
              └─────────┘
```

---

## Целевое состояние (После интеграции)

```
┌─────────────────────────────────────────────────────┐
│              Supabase Backend                       │
│                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │profiles │  │ events  │  │  hubs   │           │
│  └─────────┘  └─────────┘  └─────────┘           │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐               │
│  │event_attendees│  │ hub_members  │               │
│  └──────────────┘  └──────────────┘               │
│                                                     │
│  Auth • RLS • Realtime • Storage                   │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ @supabase/supabase-js
                   │
┌──────────────────▼──────────────────────────────────┐
│         src/lib/supabase/client.ts                  │
│         (Supabase Client Singleton)                 │
└──────────────────┬──────────────────────────────────┘
                   │
                   │
┌──────────────────▼──────────────────────────────────┐
│              src/lib/api/                           │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐                 │
│  │profiles.ts  │  │  events.ts  │                 │
│  │• getCurrentUser│• getEvents   │                 │
│  │• updateProfile│• registerFor │                 │
│  └─────────────┘  └─────────────┘                 │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐                 │
│  │  hubs.ts    │  │   map.ts    │                 │
│  │• getHubs    │  │• getMarkers │                 │
│  │• joinHub    │  │             │                 │
│  └─────────────┘  └─────────────┘                 │
│                                                     │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ API calls
                   │
┌──────────────────▼──────────────────────────────────┐
│         src/contexts/AuthContext.tsx                │
│                                                     │
│  • user: User | null                               │
│  • loading: boolean                                │
│  • isVip: boolean                                  │
│  • signInWithTwitter()                             │
│  • signOut()                                       │
│                                                     │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ useAuth()
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │Profile │ │Events  │ │ Hubs   │
   │ Page   │ │ Page   │ │ Page   │
   └────────┘ └────────┘ └────────┘
        │          │          │
        └──────────┼──────────┘
                   │
                   ▼
              ┌─────────┐
              │Map Page │
              └─────────┘
```

---

## Детальный поток: Profile Page

### Текущий (моки):
```
┌──────────────┐
│ Profile Page │
└──────┬───────┘
       │
       │ import mockUsers, mockEvents
       │
       ▼
┌──────────────────┐
│  mock-data.ts    │
│                  │
│  const user =    │
│    mockUsers[0]  │──► Hardcoded data
│                  │
│  const friends = │
│    mockUsers     │──► Hardcoded data
│    .slice(1, 4)  │
└──────────────────┘
```

### Целевой (API):
```
┌──────────────┐
│ Profile Page │
└──────┬───────┘
       │
       │ useAuth()
       │
       ▼
┌──────────────────┐
│  AuthContext     │
└──────┬───────────┘
       │
       │ getCurrentUser()
       │
       ▼
┌──────────────────┐
│  profiles.ts     │
└──────┬───────────┘
       │
       │ supabase.from('profiles')
       │
       ▼
┌──────────────────┐
│  Supabase DB     │◄──► RLS Policies
└──────────────────┘
```

---

## Детальный поток: Events Page

### Текущий (моки):
```
┌──────────────┐
│ Events Page  │
└──────┬───────┘
       │
       │ import mockEvents
       │
       ▼
┌──────────────────────┐
│    mock-data.ts      │
│                      │
│  mockEvents.filter() │──► Client-side filtering
│                      │
└──────────────────────┘
```

### Целевой (API):
```
┌──────────────┐
│ Events Page  │
└──────┬───────┘
       │
       │ getEvents({ search, type })
       │
       ▼
┌──────────────────────┐
│    events.ts         │
└──────┬───────────────┘
       │
       │ supabase.from('events')
       │   .select('*')
       │   .or('name.ilike...')
       │   .eq('event_type', type)
       │
       ▼
┌──────────────────────┐
│    Supabase DB       │◄──► RLS Policies
│                      │     (VIP events check)
│  Server-side filter  │
└──────────────────────┘
```

---

## Детальный поток: Map Page

### Текущий (моки):
```
┌──────────────┐
│   Map Page   │
└──────┬───────┘
       │
       │ getMockMarkers()
       │
       ▼
┌─────────────────────────────┐
│      mock-data.ts           │
│                             │
│  createMapMarkers(          │
│    mockUsers,               │
│    mockEvents,              │
│    mockHubs                 │
│  )                          │
│                             │
│  • Generate random coords   │
│  • Combine all markers      │
└─────────────────────────────┘
```

### Целевой (API):
```
┌──────────────┐
│   Map Page   │
└──────┬───────┘
       │
       │ getMapMarkers(filters)
       │
       ▼
┌─────────────────────────────┐
│        map.ts               │
└──────┬──────────────────────┘
       │
       ├─► supabase.from('profiles')
       │     .select('*, latitude, longitude')
       │
       ├─► supabase.from('events')
       │     .select('*')
       │
       └─► supabase.from('hubs')
             .select('*')
       │
       ▼
┌─────────────────────────────┐
│      Supabase DB            │
│                             │
│  • Real coordinates from DB │
│  • Server-side filtering    │
│  • RLS applied              │
└─────────────────────────────┘
```

---

## Auth Flow (новый после интеграции)

```
┌──────────────┐
│  Login Page  │
└──────┬───────┘
       │
       │ signInWithTwitter()
       │
       ▼
┌──────────────────────────────┐
│     AuthContext              │
└──────┬───────────────────────┘
       │
       │ supabase.auth.signInWithOAuth({
       │   provider: 'twitter'
       │ })
       │
       ▼
┌──────────────────────────────┐
│   Supabase Auth              │
└──────┬───────────────────────┘
       │
       │ Redirect to Twitter
       │
       ▼
┌──────────────────────────────┐
│   Twitter OAuth              │
└──────┬───────────────────────┘
       │
       │ User authorizes
       │
       ▼
┌──────────────────────────────┐
│   Callback: /auth/callback   │
└──────┬───────────────────────┘
       │
       │ Exchange code for session
       │
       ▼
┌──────────────────────────────┐
│   Supabase creates session   │
│   • JWT token                │
│   • Refresh token            │
└──────┬───────────────────────┘
       │
       │ Create profile if not exists
       │
       ▼
┌──────────────────────────────┐
│   profiles table             │
│   • twitter_id               │
│   • twitter_handle           │
│   • twitter_name             │
│   • avatar_url               │
└──────┬───────────────────────┘
       │
       │ onAuthStateChange
       │
       ▼
┌──────────────────────────────┐
│   AuthContext updates        │
│   • user = profile data      │
│   • loading = false          │
└──────┬───────────────────────┘
       │
       │ Redirect to /profile
       │
       ▼
┌──────────────────────────────┐
│   Profile Page               │
│   (with real user data)      │
└──────────────────────────────┘
```

---

## Event Registration Flow (новый)

```
┌──────────────┐
│  Event Card  │
└──────┬───────┘
       │
       │ User clicks "Register"
       │
       ▼
┌──────────────────────────────┐
│  registerForEvent(eventId)   │
└──────┬───────────────────────┘
       │
       │ Check auth
       │
       ▼
┌──────────────────────────────┐
│  Is user authenticated?      │
└──────┬───────────────────────┘
       │
       ├─NO──► Redirect to /login
       │
       └─YES──►
                │
                ▼
       ┌──────────────────────────────┐
       │  Check VIP status (if needed)│
       └──────┬───────────────────────┘
              │
              ▼
       ┌──────────────────────────────┐
       │  Insert into event_attendees │
       │                              │
       │  INSERT INTO event_attendees │
       │  (event_id, user_id)         │
       │  VALUES (?, auth.uid())      │
       └──────┬───────────────────────┘
              │
              ▼
       ┌──────────────────────────────┐
       │  Trigger: update count       │
       │                              │
       │  UPDATE events               │
       │  SET attendees_count += 1    │
       └──────┬───────────────────────┘
              │
              ▼
       ┌──────────────────────────────┐
       │  Return success              │
       └──────┬───────────────────────┘
              │
              │ Optimistic UI update
              │
              ▼
       ┌──────────────────────────────┐
       │  Show "Registered!" badge    │
       └──────────────────────────────┘
```

---

## VIP Subscription Flow (будущее)

```
┌──────────────────┐
│ Subscription Page│
└──────┬───────────┘
       │
       │ User clicks "Upgrade to VIP"
       │
       ▼
┌──────────────────────────────┐
│  Connect Solana Wallet       │
└──────┬───────────────────────┘
       │
       │ Wallet Adapter
       │
       ▼
┌──────────────────────────────┐
│  User approves transaction   │
└──────┬───────────────────────┘
       │
       │ Send SOL to program
       │
       ▼
┌──────────────────────────────┐
│  Get transaction signature   │
└──────┬───────────────────────┘
       │
       │ createVipSubscription(txSig)
       │
       ▼
┌──────────────────────────────┐
│  Verify transaction on-chain │
└──────┬───────────────────────┘
       │
       ├─INVALID──► Show error
       │
       └─VALID─────►
                    │
                    ▼
          ┌──────────────────────────────┐
          │  Insert into subscriptions   │
          │                              │
          │  INSERT INTO subscriptions   │
          │  (user_id, tier, tx_signature)│
          └──────┬───────────────────────┘
                 │
                 ▼
          ┌──────────────────────────────┐
          │  Update profiles             │
          │                              │
          │  UPDATE profiles             │
          │  SET subscription_tier='vip' │
          └──────┬───────────────────────┘
                 │
                 ▼
          ┌──────────────────────────────┐
          │  AuthContext refreshes       │
          │  • isVip = true              │
          └──────┬───────────────────────┘
                 │
                 │ Show success
                 │
                 ▼
          ┌──────────────────────────────┐
          │  Profile shows VIP badge     │
          │  Access to VIP features      │
          └──────────────────────────────┘
```

---

## Messages Flow (VIP only, будущее)

```
┌──────────────────┐
│  Messages Page   │
└──────┬───────────┘
       │
       │ useAuth() → isVip check
       │
       ├─NOT VIP──► Redirect to /subscription
       │
       └─VIP─────►
                 │
                 ▼
       ┌──────────────────────────────┐
       │  getConversations()          │
       └──────┬───────────────────────┘
              │
              ▼
       ┌──────────────────────────────┐
       │  supabase.from('messages')   │
       │    .select('*')              │
       │    .or('sender_id=...')      │
       └──────┬───────────────────────┘
              │
              │ RLS: user can only see their messages
              │
              ▼
       ┌──────────────────────────────┐
       │  Display conversations       │
       └──────┬───────────────────────┘
              │
              │ User selects conversation
              │
              ▼
       ┌──────────────────────────────┐
       │  Subscribe to real-time      │
       │                              │
       │  supabase                    │
       │    .channel('messages')      │
       │    .on('INSERT', ...)        │
       └──────┬───────────────────────┘
              │
              │ New message arrives
              │
              ▼
       ┌──────────────────────────────┐
       │  Auto-update UI              │
       │  (no page refresh)           │
       └──────────────────────────────┘
```

---

## Data Types Flow

```
┌────────────────────────────────────┐
│     src/types/index.ts             │
│                                    │
│  • User                            │
│  • Event                           │
│  • Hub                             │
│  • MapMarker                       │
│  • Message                         │
│  • ...                             │
└────────┬───────────────────────────┘
         │
         │ TypeScript types
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│   API Layer     │   │   Components    │
│                 │   │                 │
│  Type-safe      │   │  Type-safe      │
│  functions      │   │  props          │
└─────────────────┘   └─────────────────┘
```

---

## Security & Permissions Flow

```
┌──────────────────┐
│  Client Request  │
└──────┬───────────┘
       │
       │ API call with JWT
       │
       ▼
┌──────────────────────────────┐
│  Supabase Edge Functions     │
└──────┬───────────────────────┘
       │
       │ Validate JWT
       │
       ▼
┌──────────────────────────────┐
│  Row Level Security (RLS)    │
└──────┬───────────────────────┘
       │
       ├─► Check user permissions
       ├─► Check VIP status
       └─► Check ownership
       │
       ▼
┌──────────────────────────────┐
│  Allow/Deny data access      │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Return filtered data        │
└──────────────────────────────┘
```

---

## Performance Optimization (будущее)

```
┌──────────────────┐
│   Component      │
└──────┬───────────┘
       │
       │ useQuery('events', getEvents)
       │
       ▼
┌──────────────────────────────┐
│  React Query / SWR           │
└──────┬───────────────────────┘
       │
       ├─► Check cache first
       │   ├─ HIT ──► Return cached data
       │   └─ MISS ─► Fetch from API
       │
       ▼
┌──────────────────────────────┐
│  API Layer                   │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Supabase (with cache)       │
└──────────────────────────────┘
```

---

**Дата создания:** 13 декабря 2025  
**Статус:** 📊 Визуальная документация потоков данных


