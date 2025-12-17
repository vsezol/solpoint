# Руководство по миграции: Friends → Follows

## Обзор

Эта миграция переводит систему друзей с модели "запросы в друзья" (Facebook) на модель подписок (Instagram/Twitter).

## Что изменилось

### Старая система (friends)
- Таблица `friends` с полями `user_id`, `friend_id`, `status` (pending/accepted/blocked)
- Друзьями считались только те, у кого `status = 'accepted'`
- Требовалось подтверждение запроса

### Новая система (follows)
- Таблица `follows` с полями `follower_id`, `following_id` (односторонние подписки)
- Представление `mutual_friends` для взаимных друзей (автоматически вычисляется)
- Подписка односторонняя, друзья = взаимные подписки

## Применение миграции

### Шаг 1: Выполните SQL миграцию

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **SQL Editor**
4. Откройте файл `supabase/migrations/migrate_friends_to_follows.sql`
5. Скопируйте весь SQL код
6. Вставьте в SQL Editor и нажмите **Run**

### Шаг 2: Проверьте миграцию

Выполните следующие запросы для проверки:

```sql
-- Проверка создания таблицы follows
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'follows'
);

-- Проверка создания представления mutual_friends
SELECT EXISTS (
  SELECT FROM information_schema.views 
  WHERE table_schema = 'public' 
  AND table_name = 'mutual_friends'
);

-- Проверка миграции данных (сравните количество)
SELECT 
  (SELECT COUNT(*) FROM friends WHERE status = 'accepted') as old_friends_count,
  (SELECT COUNT(*) FROM mutual_friends) as new_mutual_friends_count;

-- Проверка подписок
SELECT COUNT(*) as total_follows FROM follows;
```

### Шаг 3: Обновите код (уже сделано)

✅ API endpoints обновлены:
- `src/app/api/friends/route.ts` - основные операции
- `src/app/api/friends/list/route.ts` - списки друзей/подписчиков

✅ Компоненты обновлены:
- `src/app/profile/[username]/page.tsx` - страница профиля
- `src/app/events/[slug]/page.tsx` - страница события
- `src/app/api/invites/use/route.ts` - использование инвайтов

## Новые API endpoints

### POST /api/friends
Подписаться на пользователя (follow)

```typescript
POST /api/friends
Body: { friend_id: string }
Response: { 
  data: { follow, status: "mutual" | "following", isMutual: boolean },
  message: string 
}
```

### DELETE /api/friends?friend_id=xxx
Отписаться от пользователя (unfollow)

```typescript
DELETE /api/friends?friend_id=xxx
Response: { message: "Unfollowed successfully" }
```

### GET /api/friends?user_id=xxx
Получить статус подписки

```typescript
GET /api/friends?user_id=xxx
Response: {
  data: {
    status: "none" | "pending_sent" | "pending_received" | "accepted",
    followStatus: "none" | "following" | "follower" | "mutual",
    isMutual: boolean,
    userFollowsOther: boolean,
    otherFollowsUser: boolean
  }
}
```

### GET /api/friends/list?user_id=xxx&type=mutual|followers|following
Получить список друзей/подписчиков/подписок

```typescript
GET /api/friends/list?user_id=xxx&type=mutual
Response: {
  data: User[],
  count: number,
  type: "mutual" | "followers" | "following"
}
```

## Новые функции базы данных

### is_following(follower_id, following_id)
Проверить, подписан ли пользователь A на пользователя B

```sql
SELECT public.is_following('user-a-id', 'user-b-id'); -- true/false
```

### are_mutual_friends(user_id, friend_id)
Проверить, являются ли два пользователя взаимными друзьями

```sql
SELECT public.are_mutual_friends('user-a-id', 'user-b-id'); -- true/false
```

### get_follow_status(user_id, other_user_id)
Получить статус подписки: 'none', 'following', 'follower', 'mutual'

```sql
SELECT public.get_follow_status('user-a-id', 'user-b-id');
```

### get_followers_count(user_id)
Получить количество подписчиков

```sql
SELECT public.get_followers_count('user-id');
```

### get_following_count(user_id)
Получить количество подписок

```sql
SELECT public.get_following_count('user-id');
```

### get_mutual_friends_count(user_id)
Получить количество взаимных друзей

```sql
SELECT public.get_mutual_friends_count('user-id');
```

## Обратная совместимость

Старая таблица `friends` остается в базе данных для обратной совместимости, но новые операции должны использовать таблицу `follows`.

## Удаление старой таблицы friends

После успешной миграции и проверки работы новой системы можно удалить устаревшую таблицу `friends`:

### Шаг 1: Убедитесь, что миграция выполнена успешно

```sql
-- Проверьте, что таблица follows существует
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'follows'
);

-- Проверьте, что представление mutual_friends существует
SELECT EXISTS (
  SELECT FROM information_schema.views 
  WHERE table_schema = 'public' 
  AND table_name = 'mutual_friends'
);

-- Проверьте количество данных
SELECT 
  (SELECT COUNT(*) FROM friends WHERE status = 'accepted') as old_friends,
  (SELECT COUNT(*) FROM mutual_friends) as new_mutual_friends,
  (SELECT COUNT(*) FROM follows) as total_follows;
```

### Шаг 2: Создайте резервную копию

**ВАЖНО:** Перед удалением создайте резервную копию базы данных!

### Шаг 3: Выполните миграцию удаления

Выполните файл `supabase/migrations/drop_friends_table.sql` через Supabase SQL Editor.

Эта миграция:
- ✅ Удалит функцию `create_mutual_friendship()` (она уже обновлена)
- ✅ Удалит RLS политики таблицы `friends`
- ✅ Удалит таблицу `friends` и все её зависимости
- ✅ Проверит наличие таблицы `follows` перед удалением (безопасность)

## Откат миграции (Rollback)

Если нужно откатить миграцию:

```sql
-- Удалить представление
DROP VIEW IF EXISTS public.mutual_friends;

-- Удалить функции
DROP FUNCTION IF EXISTS public.is_following(UUID, UUID);
DROP FUNCTION IF EXISTS public.are_mutual_friends(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_follow_status(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_followers_count(UUID);
DROP FUNCTION IF EXISTS public.get_following_count(UUID);
DROP FUNCTION IF EXISTS public.get_mutual_friends_count(UUID);

-- Удалить таблицу follows (ОСТОРОЖНО: удалит все данные!)
-- DROP TABLE IF EXISTS public.follows CASCADE;
```

**Внимание:** Откат удалит все данные о подписках. Убедитесь, что у вас есть резервная копия!

## Система инвайтов и автоматическая дружба

При регистрации по инвайт-коду пользователи автоматически становятся взаимными друзьями (mutual follows) с пригласившим их пользователем.

### Как это работает:

1. **При регистрации через Twitter с инвайт-кодом** (`src/app/api/auth/callback/route.ts`):
   - После создания профиля проверяется наличие инвайт-кода в URL
   - Создается запись в таблице `referrals`
   - Вызывается функция `create_mutual_friendship()` для создания взаимных подписок

2. **При использовании инвайт-кода вручную** (`src/app/api/invites/use/route.ts`):
   - Пользователь отправляет POST запрос с инвайт-кодом
   - Создается запись в таблице `referrals`
   - Вызывается функция `create_mutual_friendship()` для создания взаимных подписок

### Функция create_mutual_friendship

Функция создает взаимные подписки в обоих направлениях:
- `inviter_user_id` подписывается на `invited_user_id`
- `invited_user_id` подписывается на `inviter_user_id`

Это автоматически создает взаимную дружбу через представление `mutual_friends`.

### Проверка работы системы

Используйте скрипт `verify_invite_friendship.sql` для проверки:
- Существования функции `create_mutual_friendship`
- Корректности создания взаимных дружб при регистрации по инвайтам
- Статистики по инвайтам и взаимным дружбам

```sql
-- Запустите через Supabase SQL Editor
-- Файл: supabase/migrations/verify_invite_friendship.sql
```

## Поддержка

Если возникли проблемы:
1. Проверьте логи в Supabase Dashboard → Database → Logs
2. Убедитесь, что все зависимости выполнены
3. Проверьте синтаксис SQL
4. Используйте `verify_invite_friendship.sql` для диагностики
5. Обратитесь к документации в `notes/`

