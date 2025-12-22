-- Установить пользователя как owner для всех его сущностей
-- Замените 'bec61439-31c9-47e4-85a2-f2c1801542e7' на нужный user_id

-- Для events: устанавливаем owner_type = 'user' и owner_id = user_id
UPDATE public.events
SET 
  owner_type = 'user'::owner_type,
  owner_id = 'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid
WHERE organizer_id = 'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid
   OR owner_id = 'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid;

-- Для hubs: устанавливаем owner_id = user_id
UPDATE public.hubs
SET owner_id = 'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid
WHERE creator_id = 'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid
   OR owner_id = 'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid;

-- Для communities: устанавливаем owner_id = user_id
UPDATE public.communities
SET owner_id = 'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid
WHERE creator_id = 'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid
   OR owner_id = 'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid;

-- Для projects: устанавливаем owner_id = user_id
UPDATE public.projects
SET owner_id = 'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid
WHERE creator_id = 'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid
   OR owner_id = 'bec61439-31c9-47e4-85a2-f2c1801542e7'::uuid;

