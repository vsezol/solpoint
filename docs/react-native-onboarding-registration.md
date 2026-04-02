# React Native: Onboarding + Registration Flow (SolPoint)

Краткое описание, как в RN повторить текущую web-логику регистрации.

Связанный OAuth-гайд: `/Users/a1/Documents/Workspace/Typescript/solpoint/docs/react-native-twitter-oauth.md`.

## 1) Когда показывать onboarding

После успешного OAuth/exchange:
1. Вызвать `GET {BASE_URL}/api/auth/me` с `Authorization: Bearer <access_token>`.
2. Если `profile.country_code` пустой или `profile` отсутствует, показать onboarding.
3. Если `profile.country_code` заполнен, вести на основной экран.

`country_code` — ключевой маркер завершенной регистрации.

## 2) Шаги onboarding в RN

Рекомендуемые шаги как в web:
1. `Location` (обязательный):
   - `country` — строка (название страны),
   - `country_code` — обязательный ISO alpha-2 (например `US`, `AE`),
   - `city` — optional.
2. `Profile` (необязательный, но в текущем UX присутствует):
   - `bio` (до 150 символов),
   - `role` (из списка),
   - `is_open_to_meet` (boolean).

## 3) API для сохранения onboarding

Использовать один endpoint:

`PATCH {BASE_URL}/api/profile/update`

Минимальный payload для завершения регистрации:

```json
{
  "country": "United States",
  "country_code": "US",
  "city": "San Francisco"
}
```

Расширенный payload (если сразу сохраняете profile step):

```json
{
  "country": "United States",
  "country_code": "US",
  "city": "San Francisco",
  "bio": "Building on Solana",
  "role": "developer",
  "is_open_to_meet": true
}
```

## 4) Валидации, которые важно повторить в RN

1. `country_code`:
   - обязательный для завершения регистрации,
   - строка из 2 букв (ISO 3166-1 alpha-2), backend нормализует в uppercase.
2. `city`:
   - optional,
   - максимум 150 символов.
3. `bio`:
   - optional,
   - максимум 150 символов.
4. `role`:
   - одно из: `degen`, `developer`, `trader`, `investor`, `designer`, `founder`, `other`.

## 5) Роутинг после сохранения

1. После успешного `PATCH /api/profile/update` повторно вызвать `GET /api/auth/me`.
2. Если `country_code` теперь заполнен:
   - закрыть onboarding,
   - перейти на основной экран приложения.
3. Если API вернул ошибку — показать текст ошибки и оставить пользователя на текущем шаге.

## 6) Поведение с invite/redirect

1. Invite можно передавать на этапе старта OAuth (через ваш `redirect_to` сценарий) и/или применять через backend логику callback.
2. В RN onboarding это отдельно не блокирует регистрацию: основное условие завершения — заполненный `country_code`.

## 7) Минимальный state-machine для RN

1. `Unauthenticated`
2. `OAuthInProgress`
3. `AuthenticatedProfileUnknown` (после `setSession`, до `GET /api/auth/me`)
4. `NeedsOnboarding` (`country_code` пустой)
5. `Ready` (`country_code` заполнен)

Такой state-machine полностью совместим с текущей серверной логикой Next.js.
