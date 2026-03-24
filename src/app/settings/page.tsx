import { redirect } from "next/navigation";
import { Header } from "@/components/layout";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pt-[74px]">
        <section className="mx-auto flex min-h-[calc(100vh-74px)] w-full max-w-[1440px] items-center justify-center px-4 md:px-10">
          <div className="rounded-xl border border-[#2f2f2f] bg-[#0f0f0f] px-6 py-5 text-center">
            <h1
              className="text-xl font-semibold tracking-[-0.03em] text-white md:text-2xl"
              style={{ fontFamily: "var(--font-kode-mono), monospace" }}
            >
              Settings
            </h1>
            <p className="mt-2 text-sm text-white/70 md:text-base">In development</p>
          </div>
        </section>
      </main>
    </>
  );
}
