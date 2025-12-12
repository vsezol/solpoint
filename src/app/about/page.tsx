import { Header, Footer } from "@/components/layout";
import { AboutSection, TeamSection } from "@/components/landing";

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="pt-16">
        <AboutSection />
        <TeamSection />
      </main>
      <Footer />
    </>
  );
}

