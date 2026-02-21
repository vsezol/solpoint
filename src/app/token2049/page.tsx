import { Header, Footer } from "@/components/layout";
import { Token2049Map } from "./token2049-map";

export default function Token2049Page() {
  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-2">
            Token2049
          </h1>
          <p className="text-[var(--color-text-secondary)] mb-6">
            Interactive floor map. Click on zones to explore or book meetings.
          </p>
          <Token2049Map />
        </div>
      </main>
      <Footer />
    </>
  );
}
