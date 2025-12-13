import { Header, Footer } from "@/components/layout";
import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-4">404</h1>
          <p className="text-[var(--color-text-secondary)] mb-4">
            Профиль пользователя не найден
          </p>
          <Link
            href="/"
            className="text-[var(--color-primary)] hover:underline"
          >
            Вернуться на главную
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

