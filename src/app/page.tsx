import { Header, Footer } from "@/components/layout";
import { HeroSection, AboutSection, TeamSection } from "@/components/landing";

export default function Home() {
  return (
    <>
      <Header />
      <main className="grid-pattern-bg relative">
        <HeroSection />
        <AboutSection />
        <TeamSection />
      </main>
      <Footer />
    </>
  );
}
