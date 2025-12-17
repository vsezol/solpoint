# Error Boundary - Документация

## Где Error Boundary работает ✅

### 1. **Ошибки рендеринга в Client Components**
- Ошибки во время рендеринга React компонентов
- Ошибки в lifecycle методах (componentDidMount, useEffect и т.д.)
- Ошибки в конструкторах компонентов

**Пример:**
```tsx
// ✅ Будет поймано Error Boundary
function MyComponent() {
  const data = null;
  return <div>{data.property}</div>; // TypeError будет пойман
}
```

### 2. **Ошибки в дочерних компонентах**
- Любые ошибки в компонентах внутри Error Boundary

**Пример:**
```tsx
<ErrorBoundary>
  <Parent>
    <Child /> {/* Ошибка здесь будет поймана */}
  </Parent>
</ErrorBoundary>
```

### 3. **Ошибки в Server Components (через error.tsx)**
- Ошибки при загрузке данных в Server Components
- Ошибки в async Server Components

**Пример:**
```tsx
// app/users/page.tsx (Server Component)
export default async function UsersPage() {
  const users = await fetchUsers(); // Ошибка здесь будет поймана error.tsx
  return <UsersList users={users} />;
}
```

## Где Error Boundary НЕ работает ❌

### 1. **Ошибки в Event Handlers**
- Ошибки в onClick, onSubmit, onChange и других обработчиках событий
- **Решение:** Используйте try-catch внутри обработчиков

**Пример:**
```tsx
// ❌ НЕ будет поймано Error Boundary
function MyComponent() {
  const handleClick = () => {
    throw new Error("Ошибка в обработчике"); // НЕ будет поймано!
  };
  
  return <button onClick={handleClick}>Click</button>;
}

// ✅ Правильно - используйте try-catch
function MyComponent() {
  const [error, setError] = useState<string | null>(null);
  
  const handleClick = async () => {
    try {
      await someAsyncOperation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    }
  };
  
  return (
    <>
      {error && <div className="error">{error}</div>}
      <button onClick={handleClick}>Click</button>
    </>
  );
}
```

### 2. **Ошибки в асинхронном коде**
- Ошибки в setTimeout, setInterval
- Ошибки в Promise без await
- Ошибки в callbacks

**Пример:**
```tsx
// ❌ НЕ будет поймано Error Boundary
useEffect(() => {
  setTimeout(() => {
    throw new Error("Ошибка в setTimeout"); // НЕ будет поймано!
  }, 1000);
}, []);

// ✅ Правильно - обработайте ошибку
useEffect(() => {
  const timer = setTimeout(() => {
    try {
      // ваш код
    } catch (err) {
      console.error("Ошибка:", err);
      // Покажите ошибку пользователю
    }
  }, 1000);
  
  return () => clearTimeout(timer);
}, []);
```

### 3. **Ошибки в самом Error Boundary**
- Если ошибка происходит в error.tsx или ErrorBoundary компоненте
- **Решение:** Используйте `global-error.tsx` для критических ошибок

### 4. **Ошибки в layout.tsx (без global-error.tsx)**
- Ошибки в корневом layout.tsx не ловятся обычным error.tsx
- **Решение:** Создайте `app/global-error.tsx`

### 5. **Ошибки в Server Actions**
- Ошибки в Server Actions должны обрабатываться на стороне сервера
- **Решение:** Используйте try-catch и возвращайте ошибки клиенту

**Пример:**
```tsx
// app/actions.ts
"use server";

export async function updateProfile(data: FormData) {
  try {
    // ваш код
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка" };
  }
}

// В компоненте
const result = await updateProfile(formData);
if (result?.error) {
  setError(result.error);
}
```

### 6. **Ошибки в API Routes**
- Ошибки в `/api/*` routes не ловятся Error Boundary
- **Решение:** Обрабатывайте ошибки в route handlers

**Пример:**
```tsx
// app/api/users/route.ts
export async function GET() {
  try {
    const users = await getUsers();
    return Response.json({ users });
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
```

## Структура Error Boundaries в проекте

```
src/app/
├── error.tsx              # Глобальный Error Boundary для всех страниц
├── global-error.tsx       # Error Boundary для layout.tsx (критические ошибки)
├── map/
│   └── error.tsx         # Локальный Error Boundary для страницы карты
├── events/
│   └── error.tsx         # Локальный Error Boundary для страницы событий
└── hubs/
    └── error.tsx         # Локальный Error Boundary для страницы хабов
```

## Рекомендации по использованию

### 1. **Для Event Handlers**
Всегда используйте try-catch:

```tsx
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError(null);
  
  try {
    await submitForm();
  } catch (err) {
    setError(err instanceof Error ? err.message : "Ошибка отправки");
  } finally {
    setIsLoading(false);
  }
};
```

### 2. **Для асинхронных операций в useEffect**
```tsx
useEffect(() => {
  let cancelled = false;
  
  async function loadData() {
    try {
      const data = await fetchData();
      if (!cancelled) {
        setData(data);
      }
    } catch (err) {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      }
    }
  }
  
  loadData();
  
  return () => {
    cancelled = true;
  };
}, []);
```

### 3. **Для React Query**
React Query автоматически обрабатывает ошибки, но можно добавить глобальный обработчик:

```tsx
// В QueryProvider
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (error) => {
        console.error("Query error:", error);
        // Можно показать toast или отправить в мониторинг
      },
    },
  },
});
```

## Итоговая таблица

| Тип ошибки | Поймает Error Boundary? | Решение |
|------------|------------------------|---------|
| Ошибка рендеринга компонента | ✅ Да | Автоматически |
| Ошибка в Server Component | ✅ Да | Через error.tsx |
| Ошибка в onClick/onSubmit | ❌ Нет | try-catch в обработчике |
| Ошибка в setTimeout | ❌ Нет | try-catch в callback |
| Ошибка в Promise без await | ❌ Нет | .catch() или try-catch |
| Ошибка в layout.tsx | ❌ Нет* | global-error.tsx |
| Ошибка в API Route | ❌ Нет | try-catch в handler |
| Ошибка в Server Action | ❌ Нет | try-catch в action |

*Без global-error.tsx

