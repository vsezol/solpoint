import { Header, Footer } from "@/components/layout";
import { Token2049Map } from "./token2049-map";

export default function Token2049Page() {
  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen flex flex-col">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-1">
            Token2049
          </h1>
          <p className="text-[var(--color-text-secondary)] mb-4">
            Interactive floor map. Drag to pan, scroll or pinch to zoom. Click on zones to explore or book meetings.
          </p>
        </div>
        <div className="flex-1 w-full min-h-0 px-4 sm:px-6 lg:px-8 pb-6">
          <Token2049Map />
        </div>
      </main>
      <Footer />
    </>
  );
}
