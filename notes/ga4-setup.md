# Настройка Google Analytics 4 (GA4)

## Обзор

Приложение использует Google Analytics 4 для отслеживания пользовательских взаимодействий. Настройка выполняется через переменную окружения `NEXT_PUBLIC_GA4_MEASUREMENT_ID`.

## Рекомендуемый подход: отдельные properties для dev и prod

### Вариант 1: Отдельные GA4 Properties (Рекомендуется)

**Преимущества:**
- Чистое разделение данных разработки и продакшена
- Нет риска загрязнения production данных тестовыми событиями
- Легко настроить разные права доступа для команды

**Настройка:**

1. **Создайте два GA4 properties:**
   - `SolPoint Dev` - для разработки
   - `SolPoint Production` - для продакшена

2. **Для разработки (.env.local):**
   ```env
   NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX  # Dev Measurement ID
   ```

3. **Для продакшена (Vercel/другая платформа):**
   - Установите переменную окружения в настройках деплоя:
   ```env
   NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-YYYYYYYYYY  # Production Measurement ID
   ```

### Вариант 2: Один Property с фильтрами

Если хотите использовать один GA4 property:

1. Создайте один GA4 property
2. Используйте один Measurement ID для обоих окружений
3. В GA4 создайте фильтры по hostname:
   - Dev: `localhost:3000`
   - Prod: `yourdomain.com`

**Недостатки:** данные разработки будут смешиваться с production данными.

## Как получить Measurement ID

1. Перейдите в [Google Analytics](https://analytics.google.com/)
2. Выберите или создайте GA4 property
3. Перейдите в **Admin** → **Data Streams**
4. Выберите ваш stream (или создайте новый)
5. Скопируйте **Measurement ID** (формат: `G-XXXXXXXXXX`)

## Настройка для разных окружений

### Локальная разработка

Создайте файл `.env.local` в корне проекта:

```env
# .env.local
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX  # Ваш dev Measurement ID
```

### Production (Vercel)

1. Перейдите в настройки проекта на Vercel
2. **Settings** → **Environment Variables**
3. Добавьте переменную:
   - **Name:** `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
   - **Value:** `G-YYYYYYYYYY` (ваш production Measurement ID)
   - **Environment:** Production (и Preview, если нужно)

### Production (другие платформы)

Установите переменную окружения `NEXT_PUBLIC_GA4_MEASUREMENT_ID` в настройках вашей платформы деплоя.

## Проверка работы

### В режиме разработки

Если `NEXT_PUBLIC_GA4_MEASUREMENT_ID` не установлен:
- События будут логироваться в консоль браузера
- В консоли вы увидите: `[GA4 Event] event_name { params }`

Если `NEXT_PUBLIC_GA4_MEASUREMENT_ID` установлен:
- События будут отправляться в GA4
- Проверьте в GA4 → **Reports** → **Realtime** (должны видеть события в реальном времени)

### В продакшене

1. Откройте приложение в продакшене
2. Выполните несколько действий (клики, переходы по страницам)
3. Проверьте в GA4 → **Reports** → **Realtime**

## Отключение GA4

Чтобы временно отключить GA4:
- Просто не устанавливайте `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
- Или установите пустое значение: `NEXT_PUBLIC_GA4_MEASUREMENT_ID=`

## Отслеживаемые события

Все события определены в `notes/analitics-plan.md`. Основные категории:

- **Authentication:** login, signup, logout
- **Events:** просмотры, регистрации на события
- **Hubs:** просмотры, присоединения к хабам
- **Map:** просмотры карты, фильтры, клики по маркерам
- **Profiles:** просмотры профилей, добавление в друзья
- **Subscription:** просмотры страницы подписки, покупки VIP

## Troubleshooting

### События не отправляются

1. Проверьте, что `NEXT_PUBLIC_GA4_MEASUREMENT_ID` установлен
2. Проверьте консоль браузера на ошибки
3. Убедитесь, что нет блокировщиков рекламы (они могут блокировать GA4)
4. Проверьте Network tab в DevTools - должны быть запросы к `google-analytics.com`

### События отправляются, но не видны в GA4

1. GA4 может задерживать данные на 24-48 часов для некоторых отчетов
2. Проверьте **Realtime** отчет - там данные появляются сразу
3. Убедитесь, что используете правильный Measurement ID

### В dev режиме события не логируются

- Это нормально, если GA4 не инициализирован (нет Measurement ID)
- События логируются только если GA4 доступен, но в dev режиме

