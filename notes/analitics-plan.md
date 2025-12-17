
Анализ фич для Google Analytics. Ниже список событий и метрик для отслеживания взаимодействий.

## Анализ фич для Google Analytics

### Критичные события (высокий приоритет)

#### 1. Аутентификация и регистрация
- `login_start` — начало входа через Twitter
- `login_success` — успешный вход
- `login_error` — ошибка входа (с типом ошибки)
- `signup_start` — начало регистрации
- `signup_success` — успешная регистрация
- `logout` — выход

#### 2. События (Events)
- `event_view` — просмотр страницы события (с `event_id`, `event_slug`, `event_type`)
- `event_card_click` — клик по карточке события
- `event_attend_click` — клик "Attend"/"Buy Tickets"
- `event_attend_success` — успешная регистрация на событие
- `event_attend_error` — ошибка регистрации
- `event_share_click` — клик "Share Event"
- `event_social_link_click` — клик по соцсетям события (Twitter/Instagram/Facebook/Website)
- `event_filter_change` — изменение фильтра событий (тип: official/community/meetup/private)
- `event_search` — поиск событий (с длиной запроса)

#### 3. Хабы (Hubs)
- `hub_view` — просмотр страницы хаба (с `hub_id`, `hub_slug`)
- `hub_card_click` — клик по карточке хаба
- `hub_join_click` — клик "Join Hub"
- `hub_join_success` — успешное присоединение к хабу
- `hub_share_click` — клик "Share Hub"
- `hub_social_link_click` — клик по соцсетям хаба
- `hub_search` — поиск хабов

#### 4. Карта (Map)
- `map_view` — просмотр карты
- `map_marker_click` — клик по маркеру (тип: user/event/hub)
- `map_filter_change` — изменение фильтров:
  - `content_type` (all/users/events/hubs)
  - `country`
  - `city`
  - `event_type`
  - `user_role`
  - `open_to_meet`
  - `active_only` (VIP)
- `map_filter_reset` — сброс фильтров
- `map_zoom` — изменение масштаба
- `map_pan` — перемещение по карте

#### 5. Профили пользователей
- `profile_view` — просмотр профиля (с `user_id`, `is_own_profile`)
- `profile_edit_start` — начало редактирования профиля
- `profile_edit_save` — сохранение изменений профиля
- `profile_add_friend_click` — клик "Add Friend"
- `profile_add_friend_success` — успешное добавление в друзья
- `profile_remove_friend` — удаление из друзей
- `profile_social_link_click` — клик по соцсетям профиля
- `profile_friends_section_view` — просмотр раздела друзей

### Средний приоритет

#### 6. Подписка VIP
- `subscription_page_view` — просмотр страницы подписки
- `subscription_upgrade_click` — клик "Upgrade to VIP"
- `subscription_payment_start` — начало оплаты
- `subscription_payment_success` — успешная оплата
- `subscription_payment_error` — ошибка оплаты
- `subscription_benefit_view` — просмотр преимуществ VIP

#### 7. Поиск и навигация
- `search_performed` — выполнен поиск (с `query`, `page_type`: events/hubs/map)
- `search_result_click` — клик по результату поиска
- `navigation_click` — клик по навигации (Header/Footer)
- `cta_button_click` — клик по CTA на главной странице

#### 8. Социальные взаимодействия
- `social_share` — шаринг контента (с `content_type`, `content_id`, `platform`)
- `external_link_click` — клик по внешним ссылкам (соцсети, сайты)

### Низкий приоритет (дополнительные метрики)

#### 9. Вовлеченность
- `page_scroll_depth` — глубина прокрутки (25%, 50%, 75%, 100%)
- `time_on_page` — время на странице
- `card_hover` — наведение на карточки (events/hubs/users)
- `image_view` — просмотр изображений событий/хабов

#### 10. Ошибки и технические метрики
- `error_occurred` — ошибки (с типом и контекстом)
- `api_error` — ошибки API
- `page_load_time` — время загрузки страницы
- `map_load_time` — время загрузки карты

### Рекомендуемая структура событий

Для каждого события передавать:

```javascript
{
  event_name: "event_attend_success",
  event_category: "Events",
  event_label: "event_slug_or_id",
  // Дополнительные параметры
  event_type: "official" | "community" | "meetup" | "private",
  is_paid: boolean,
  price_sol: number,
  user_id: string, // если авторизован
  is_vip: boolean,
  // Контекст
  page_path: string,
  referrer: string
}
```

### Приоритизация внедрения

Фаза 1 (критично):
1. Аутентификация (login/signup)
2. События (просмотры, регистрации)
3. Карта (просмотры, фильтры, клики по маркерам)
4. Профили (просмотры, добавление в друзья)

Фаза 2 (важно):
5. Хабы (просмотры, присоединения)
6. Подписка VIP (конверсия)
7. Поиск (запросы и результаты)

Фаза 3 (опционально):
8. Вовлеченность (scroll, hover)
9. Технические метрики (производительность)

### Ключевые метрики для отслеживания

- Конверсия регистрации: `signup_success / signup_start`
- Конверсия событий: `event_attend_success / event_view`
- Конверсия VIP: `subscription_payment_success / subscription_page_view`
- Вовлеченность карты: `map_marker_click / map_view`
- Социальное взаимодействие: `profile_add_friend_success / profile_view`

Нужна помощь с внедрением Google Analytics 4 (GA4) или Google Tag Manager (GTM)?