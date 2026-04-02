# Frontend API Reference (Generated from code)

Полный список API-эндпоинтов, которые доступны из фронтенда, на основе файлов в `src/app/api/**/route.ts`.

## Notes
- `Auth: yes` означает, что в обработчике есть проверка текущего пользователя (обычно через `supabase.auth.getUser()`).
- Для части эндпоинтов требуется дополнительная роль (например admin) или ownership-проверки в самом handler/RLS.
- Детальные payload/response по ключевым flows: `/Users/a1/Documents/Workspace/Typescript/solpoint/docs/auth-spec.md`, `/Users/a1/Documents/Workspace/Typescript/solpoint/docs/events-and-profile-spec.md`.

## admin

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/admin/events/[id]/dismiss-verification` | `POST` | yes |
| `/api/admin/luma-config/[id]` | `PATCH` | yes |
| `/api/admin/luma-config` | `GET, POST` | yes |
| `/api/admin/luma-scraper` | `POST` | yes |
| `/api/admin/luma/enrich-locations` | `POST` | yes |
| `/api/admin/luma/enrich-timezones` | `POST` | yes |
| `/api/admin/luma/required-verification` | `GET` | yes |
| `/api/admin/luma/save-images` | `POST` | yes |
| `/api/admin/luma/transfer` | `POST` | yes |
| `/api/admin/submissions/[id]` | `PATCH` | yes |
| `/api/admin/submissions` | `GET` | yes |

## auth

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/auth/callback` | `GET` | yes |
| `/api/auth/logout` | `POST` | no/unknown |
| `/api/auth/me` | `GET` | yes |
| `/api/auth/mobile/exchange` | `POST` | no/unknown |
| `/api/auth/session` | `GET` | yes |
| `/api/auth/twitter` | `GET` | no/unknown |

## chats

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/chats/[chatId]/messages` | `GET, POST` | yes |
| `/api/chats/[chatId]/read` | `PATCH` | yes |
| `/api/chats/[chatId]` | `GET` | yes |
| `/api/chats` | `GET, POST` | yes |

## communities

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/communities/[identifier]/friends` | `GET` | yes |
| `/api/communities/[identifier]/image` | `DELETE, POST` | yes |
| `/api/communities/[identifier]/members/[userId]/role` | `PATCH` | yes |
| `/api/communities/[identifier]/members/[userId]` | `DELETE` | yes |
| `/api/communities/[identifier]/members` | `GET` | yes |
| `/api/communities/[identifier]` | `PATCH` | yes |
| `/api/communities/[identifier]/transfer-ownership` | `POST` | yes |
| `/api/communities` | `GET, POST` | yes |
| `/api/communities/slug/[slug]` | `GET` | no/unknown |

## countries

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/countries/[code]` | `GET` | no/unknown |
| `/api/countries` | `GET` | no/unknown |

## cron

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/cron/luma-pipeline` | `GET, POST` | yes |

## dashboard

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/dashboard/entities` | `GET` | yes |
| `/api/dashboard/events/[entityType]/[entityId]` | `GET` | yes |
| `/api/dashboard/events` | `GET` | yes |
| `/api/dashboard/has-entities` | `GET` | yes |

## events

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/events/[identifier]/attendees` | `GET` | yes |
| `/api/events/[identifier]/friends` | `GET` | yes |
| `/api/events/[identifier]/image` | `DELETE, POST` | yes |
| `/api/events/[identifier]/members/[userId]/role` | `PATCH` | yes |
| `/api/events/[identifier]/members/[userId]` | `DELETE` | yes |
| `/api/events/[identifier]/members` | `DELETE, GET, PATCH, POST` | yes |
| `/api/events/[identifier]` | `GET` | yes |
| `/api/events/[identifier]/transfer-ownership` | `POST` | yes |
| `/api/events` | `GET, POST` | yes |

## friends

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/friends/list` | `GET` | yes |
| `/api/friends/requests` | `DELETE, GET, POST` | yes |
| `/api/friends` | `DELETE, GET, POST` | yes |
| `/api/friends/stats` | `GET` | yes |
| `/api/friends/status` | `POST` | yes |

## geolocation

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/geolocation/geocode` | `GET` | no/unknown |
| `/api/geolocation/ip` | `GET` | no/unknown |
| `/api/geolocation/reverse` | `GET` | no/unknown |

## hubs

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/hubs/[identifier]/friends` | `GET` | yes |
| `/api/hubs/[identifier]/image` | `DELETE, POST` | yes |
| `/api/hubs/[identifier]/members/[userId]/role` | `PATCH` | yes |
| `/api/hubs/[identifier]/members/[userId]` | `DELETE` | yes |
| `/api/hubs/[identifier]/members` | `GET` | yes |
| `/api/hubs/[identifier]` | `PATCH` | yes |
| `/api/hubs/[identifier]/transfer-ownership` | `POST` | yes |
| `/api/hubs` | `GET, POST` | yes |
| `/api/hubs/slug/[slug]` | `GET` | no/unknown |

## invites

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/invites` | `GET, POST` | yes |
| `/api/invites/use` | `POST` | yes |

## meeting-requests

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/meeting-requests/[id]/approve` | `POST` | no/unknown |
| `/api/meeting-requests/[id]/reject` | `POST` | no/unknown |
| `/api/meeting-requests/[id]/reschedule` | `POST` | no/unknown |
| `/api/meeting-requests/counts` | `GET` | no/unknown |
| `/api/meeting-requests/events/read` | `PATCH` | no/unknown |
| `/api/meeting-requests` | `GET, POST` | no/unknown |

## members

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/members` | `GET` | yes |

## profile

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/profile/affiliations` | `GET` | yes |
| `/api/profile/banner` | `DELETE, POST` | yes |
| `/api/profile/data` | `GET` | yes |
| `/api/profile/open-to-meet` | `PATCH` | yes |
| `/api/profile/stats` | `GET` | no/unknown |
| `/api/profile/update` | `PATCH` | yes |

## projects

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/projects/[identifier]/friends` | `GET` | yes |
| `/api/projects/[identifier]/image` | `DELETE, POST` | yes |
| `/api/projects/[identifier]/members/[userId]/role` | `PATCH` | yes |
| `/api/projects/[identifier]/members/[userId]` | `DELETE` | yes |
| `/api/projects/[identifier]/members` | `GET` | yes |
| `/api/projects/[identifier]` | `PATCH` | yes |
| `/api/projects/[identifier]/transfer-ownership` | `POST` | yes |
| `/api/projects` | `GET, POST` | yes |
| `/api/projects/slug/[slug]` | `GET` | no/unknown |

## submissions

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/submissions` | `GET, POST` | yes |

## subscriptions

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/subscriptions/activate` | `POST` | yes |
| `/api/subscriptions/calculate-sol-amount` | `POST` | no/unknown |
| `/api/subscriptions/check-min-amount` | `GET` | no/unknown |
| `/api/subscriptions/check-payment` | `POST` | no/unknown |
| `/api/subscriptions/create-intent-with-signature` | `POST` | no/unknown |
| `/api/subscriptions/create-intent` | `POST` | no/unknown |
| `/api/subscriptions/create-payment` | `POST` | yes |
| `/api/subscriptions/current` | `GET` | yes |
| `/api/subscriptions/intent` | `GET` | no/unknown |
| `/api/subscriptions/manual-check` | `POST` | yes |
| `/api/subscriptions/plans` | `GET` | no/unknown |
| `/api/subscriptions/recover-intent` | `POST` | no/unknown |
| `/api/subscriptions/solana-payment` | `POST` | no/unknown |
| `/api/subscriptions/verify-transaction` | `POST` | no/unknown |
| `/api/subscriptions/webhook` | `POST` | yes |

## twitter

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/twitter/mutual-followers` | `GET` | yes |

## users

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/users/created-entities` | `GET` | yes |
| `/api/users/list` | `GET` | yes |
| `/api/users` | `GET` | no/unknown |

## workspaces

| Endpoint | Methods | Auth |
|---|---|---|
| `/api/workspaces/[identifier]/friends` | `GET` | yes |
| `/api/workspaces/[identifier]/image` | `DELETE, POST` | yes |
| `/api/workspaces/[identifier]/members` | `GET` | yes |
| `/api/workspaces/[identifier]` | `GET, PATCH` | yes |
| `/api/workspaces/[identifier]/transfer-ownership` | `POST` | yes |
| `/api/workspaces` | `GET, POST` | yes |
| `/api/workspaces/slug/[slug]` | `GET` | no/unknown |

## Total
- Route files: 114
