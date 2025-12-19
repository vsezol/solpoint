import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header, Footer } from "@/components/layout";

export default async function AdminPage() {
  const supabase = await createClient();

  // Получаем текущего пользователя
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/login");
  }

  // Получаем профиль пользователя (получаем все поля через *)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (profileError || !profile) {
    // Ошибка загрузки профиля - редиректим на главную
    redirect("/");
  }

  // Проверяем наличие поля is_admin (миграция может быть не выполнена)
  if (!('is_admin' in profile)) {
    return (
      <>
        <Header />
        <main className="pt-16 min-h-screen bg-[var(--color-background)]">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
              <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)] rounded-lg p-6">
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
                  ⚠️ Миграция не выполнена
                </h1>
                <p className="text-[var(--color-text-secondary)] mb-4">
                  Поле <code className="bg-[var(--color-surface)] px-2 py-1 rounded">is_admin</code> не существует в базе данных.
                </p>
                <p className="text-[var(--color-text-secondary)] mb-4">
                  Выполните миграцию из файла <code className="bg-[var(--color-surface)] px-2 py-1 rounded">supabase/migrations/add_admin_field.sql</code> через Supabase Dashboard → SQL Editor
                </p>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  💡 Для диагностики перейдите на <a href="/admin/debug" className="text-[var(--color-primary)] hover:underline">/admin/debug</a>
                </p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Если поле is_admin существует, но равно false или null
  if (!profile.is_admin) {
    // Пользователь не является админом
    redirect("/");
  }

  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-[var(--color-background)]">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
                Админ-панель
              </h1>
              <p className="text-[var(--color-text-secondary)]">
                Управление системой и пользователями
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Статистика */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                  Статистика
                </h2>
                <p className="text-[var(--color-text-secondary)]">
                  Здесь будет статистика системы
                </p>
              </div>

              {/* Управление пользователями */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                  Пользователи
                </h2>
                <p className="text-[var(--color-text-secondary)]">
                  Управление пользователями
                </p>
              </div>

              {/* События */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                  События
                </h2>
                <p className="text-[var(--color-text-secondary)]">
                  Управление событиями
                </p>
              </div>

              {/* Хабы */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                  Хабы
                </h2>
                <p className="text-[var(--color-text-secondary)]">
                  Управление хабами
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

