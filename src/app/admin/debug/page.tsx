import { createClient } from "@/lib/supabase/server";
import { Header, Footer } from "@/components/layout";
import { redirect } from "next/navigation";

export default async function AdminDebugPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/login");
  }

  // Пытаемся получить профиль
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-[var(--color-background)]">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
                🔍 Отладочная информация
              </h1>
              
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                    Состояние профиля
                  </h2>
                  {profileError ? (
                    <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)] rounded p-4">
                      <p className="text-[var(--color-text-secondary)] font-mono text-sm">
                        Ошибка: {JSON.stringify(profileError, null, 2)}
                      </p>
                    </div>
                  ) : profile ? (
                    <div className="bg-[var(--color-success)]/10 border border-[var(--color-success)] rounded p-4">
                      <pre className="text-[var(--color-text-secondary)] font-mono text-xs overflow-auto">
                        {JSON.stringify(profile, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-[var(--color-text-secondary)]">Профиль не найден</p>
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                    Поле is_admin
                  </h2>
                  {profile ? (
                    <div>
                      {profile.hasOwnProperty('is_admin') ? (
                        <div className="bg-[var(--color-success)]/10 border border-[var(--color-success)] rounded p-4">
                          <p className="text-[var(--color-text-primary)]">
                            ✅ Поле <code className="bg-[var(--color-background)] px-2 py-1 rounded">is_admin</code> существует
                          </p>
                          <p className="text-[var(--color-text-secondary)] mt-2">
                            Значение: <code className="bg-[var(--color-background)] px-2 py-1 rounded">{String(profile.is_admin)}</code>
                          </p>
                          {!profile.is_admin && (
                            <p className="text-[var(--color-text-secondary)] mt-2">
                              💡 Чтобы получить доступ к админ-панели, установите <code className="bg-[var(--color-background)] px-2 py-1 rounded">is_admin = true</code> в базе данных
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)] rounded p-4">
                          <p className="text-[var(--color-text-primary)]">
                            ❌ Поле <code className="bg-[var(--color-background)] px-2 py-1 rounded">is_admin</code> не существует в базе данных
                          </p>
                          <p className="text-[var(--color-text-secondary)] mt-2">
                            Выполните миграцию из файла <code className="bg-[var(--color-background)] px-2 py-1 rounded">supabase/migrations/add_admin_field.sql</code>
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[var(--color-text-secondary)]">Невозможно проверить (профиль не загружен)</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}



