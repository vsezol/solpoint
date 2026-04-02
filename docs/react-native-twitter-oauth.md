# React Native: Twitter OAuth Integration (SolPoint)

Краткий чеклист для RN-клиента под текущий backend flow.

## 1) Старт OAuth

Открывайте в браузере:

`GET {BASE_URL}/api/auth/twitter?redirect_to={encodeURIComponent("solpointmobile://auth/callback")}`

Где:
- `BASE_URL` — ваш Next.js backend (например, `http://192.168.10.4:3000` в dev LAN).

## 2) Обработка deep link

Слушайте `solpointmobile://auth/callback`:
- `auth=success&code=...` → переход к шагу exchange.
- `auth=error&error=...` → показать ошибку пользователю.

## 3) Exchange one-time code

Запрос:

`POST {BASE_URL}/api/auth/mobile/exchange`

Body:

```json
{ "code": "<from_deep_link>" }
```

Успех:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user_id": "..."
}
```

Ошибки:
- `invalid_or_expired_code`
- `code_already_used`
- `internal_error`

## 4) Установить сессию в RN Supabase client

После exchange вызовите:
- `supabase.auth.setSession({ access_token, refresh_token })`

## 5) Получить профиль и решить роутинг

Вызов:

`GET {BASE_URL}/api/auth/me`  
Header: `Authorization: Bearer <access_token>`

Логика:
- если `profile.country_code` пустой → показывать onboarding (location step),
- иначе → основной экран приложения.

## 6) Важные заметки

- Не передавайте токены в deep link URL.
- One-time code одноразовый и короткоживущий (TTL ~120 сек).
- Для телефона в dev используйте LAN URL backend, не `localhost`.
- В Supabase Redirect URLs должны быть:
  - `http://192.168.10.4:3000/api/auth/callback`
  - `https://<prod-domain>/api/auth/callback`
