"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { CreateEventForm } from "@/components/ui";

export default function AdminCreateEventPage() {
  const router = useRouter();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--color-background)] pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-5xl">
            <Link
              href="/admin"
              className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to admin panel
            </Link>

            <div className="mb-6 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-6">
              <h1 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">
                Create Event Manually
              </h1>
              <p className="text-[var(--color-text-secondary)]">
                Admins can publish events directly without moderation.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-6">
              <CreateEventForm
                onSuccess={(event) => router.push(`/events/${event.slug}`)}
                onCancel={() => router.push("/admin")}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
