import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import EventsPageMajorLocal from "./events-page-major-local";

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <>
          <Header />
          <main className="min-h-screen bg-black pb-16 pt-20 text-white">
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#14f195]" />
            </div>
          </main>
          <Footer />
        </>
      }
    >
      <EventsPageMajorLocal />
    </Suspense>
  );
}
