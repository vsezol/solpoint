import { Header, Footer } from "@/components/layout";
import {
  HeroSection,
  FeaturesSection,
  TeamSection,
} from "@/components/landing";

export default function Home() {
  return (
    <>
      <Header />
      <main className="grid-pattern-bg relative">
        <HeroSection />
        <FeaturesSection />
        <TeamSection />
      </main>
      <Footer />
    </>
  );
}
