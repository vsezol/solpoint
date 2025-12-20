import { Header, Footer } from "@/components/layout";
import { Button } from "@/components/ui";
import { Users } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <Users className="w-24 h-24 text-[var(--color-text-muted)] mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-4">
              Hub Not Found
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] mb-8">
              The hub you're looking for doesn't exist or has been removed.
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="primary" asChild>
                <Link href="/hubs">Browse All Hubs</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Go Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}



