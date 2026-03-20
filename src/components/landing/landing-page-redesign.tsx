/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/layout";

const kodeMonoStyle = {
  fontFamily: "var(--font-kode-mono), monospace",
};

const figmaAssets = {
  cardDanielAvatar: "https://www.figma.com/api/mcp/asset/0844cdcf-2228-44b0-bcf0-f997c8936992",
  cardJoshAvatar: "https://www.figma.com/api/mcp/asset/3c8f969c-9c0e-4a9d-a2fc-cc6d8cf6a256",
  cardEventMiami: "https://www.figma.com/api/mcp/asset/ad83ac00-97fd-4845-b61e-9692151d0a25",
  cardEventBreakpoint: "https://www.figma.com/api/mcp/asset/0eee1837-daf3-477c-ab3d-f0e754211c26",
  cardEventMtndao: "https://www.figma.com/api/mcp/asset/6dcdcefb-fde1-4a90-887d-7625a49a71a9",
} as const;

const badges = [
  {
    title: "Member",
    logoSrc: "/monkedao.jpg",
    nameTop: "Monke",
    nameBottom: "DAO",
    nameStyle: { fontFamily: "var(--font-lalezar), cursive", fontWeight: 400 } as const,
  },
  {
    title: "Supported by",
    logoSrc: "/superteamkz.png",
    nameTop: "Superteam",
    nameBottom: "Kazakhstan",
    nameStyle: { fontFamily: "var(--font-iceland), sans-serif", fontWeight: 400 } as const,
  },
  {
    title: "Alumni",
    logoSrc: "/encodeclb.jpg",
    nameTop: "Encode",
    nameBottom: "Club",
    nameStyle: { fontFamily: "var(--font-iceland), sans-serif", fontWeight: 400 } as const,
  },
] as const;

const stepCards = [
  {
    number: "1",
    title: "SIGN UP AND COMPLETE PROFILE",
    subtitle: "Complete your profile to get noticed",
    cta: "SET UP PROFILE",
    href: "/signup",
    previewType: "profile",
  },
  {
    number: "2",
    title: "CHOOSE AN EVENT TO ATTEND",
    subtitle: "Pick where you want to network",
    cta: "VIEW EVENTS",
    href: "/events",
    previewType: "events",
  },
  {
    number: "3",
    title: "CONNECT AND MEET THE RIGHT PEOPLE",
    subtitle: "Discover the right attendees",
    cta: "FIND PEOPLE",
    href: "/map",
    previewType: "people",
  },
] as const;

const faqItems = [
  "What is SolPoint?",
  "How does SolPoint work?",
  "What makes SolPoint different?",
] as const;

function BadgeRow({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-3", className)}>
      {badges.map((badge) => (
        <article
          key={badge.title}
          className="flex flex-col items-center rounded-[11px] border border-[#303030] bg-black px-3 py-2.5"
        >
          <p className="self-center text-[12px] leading-[1.1] text-white/70" style={kodeMonoStyle}>
            {badge.title}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/25 sm:h-10 sm:w-10">
              <img
                src={badge.logoSrc}
                alt={`${badge.nameTop} ${badge.nameBottom} logo`}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="text-[17px] font-bold leading-[0.95] text-white" style={badge.nameStyle}>
                {badge.nameTop}
              </p>
              <p className="text-[17px] font-bold leading-[0.95] text-white" style={badge.nameStyle}>
                {badge.nameBottom}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function StepPreview({ type }: { type: (typeof stepCards)[number]["previewType"] }) {
  if (type === "profile") {
    return (
      <div className="h-[112px] w-[116px] shrink-0 rounded-[4px] bg-[linear-gradient(135deg,#9B45FE_0%,#00F68B_100%)] p-[1px]">
        <div className="relative h-full w-full overflow-hidden rounded-[3px] bg-[#121212]">
          {/* Map starts just below the avatar, peeks from behind its bottom edge */}
          <img
            src="/mapbase.svg"
            alt=""
            aria-hidden
            className="absolute inset-x-0 w-full object-cover opacity-65"
            style={{ top: "52px", height: "58px" }}
          />
          {/* Foreground: SolPoint → avatar → Daniel pushed to bottom */}
          <div className="relative z-10 flex h-full flex-col items-center p-1.5">
            <p className="text-center text-[9px] font-bold leading-[100%] text-white/85" style={kodeMonoStyle}>
              SolPoint
            </p>
            <div className="mt-1 h-[46px] w-[46px] overflow-hidden rounded-full border border-[#00f58d]">
              <img src={figmaAssets.cardDanielAvatar} alt="Daniel" className="h-full w-full object-cover" />
            </div>
            <p className="mt-auto text-center text-[9px] font-bold leading-[100%] text-white/85" style={kodeMonoStyle}>
              Daniel
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (type === "events") {
    return (
      <div className="h-[112px] w-[116px] shrink-0 rounded-[4px] bg-[linear-gradient(135deg,#9B45FE_0%,#00F68B_100%)] p-[1px]">
        <div className="flex h-full w-full flex-col rounded-[3px] bg-[#121212] px-1.5 pb-2 pt-1.5">
          {/* Triangle arrangement: two icons top row, one larger icon below-center */}
          <div className="relative h-[62px] w-full">
            <div className="absolute left-[6px] top-0 h-[28px] w-[28px] overflow-hidden rounded-[6px] border border-[#2a2a2a] bg-[#131313]">
              <img src={figmaAssets.cardEventBreakpoint} alt="Event" className="h-full w-full object-cover opacity-85" />
            </div>
            <div className="absolute right-[6px] top-0 h-[28px] w-[28px] overflow-hidden rounded-[6px] border border-[#2a2a2a] bg-[#131313]">
              <img src={figmaAssets.cardEventMtndao} alt="Event" className="h-full w-full object-cover opacity-85" />
            </div>
            <div className="absolute bottom-0 left-1/2 h-[34px] w-[34px] -translate-x-1/2 overflow-hidden rounded-[8px] border border-[#2a2a2a]">
              <img src={figmaAssets.cardEventMiami} alt="Event" className="h-full w-full object-cover" />
            </div>
          </div>
          <p className="mt-auto whitespace-nowrap text-[9px] font-bold leading-[100%] tracking-[-0.27px] text-white/90" style={kodeMonoStyle}>
            Solana accelerate USA
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[112px] w-[116px] shrink-0 rounded-[4px] bg-[linear-gradient(135deg,#9B45FE_0%,#00F68B_100%)] p-[1px]">
      <div className="flex h-full w-full flex-col items-center justify-center rounded-[3px] bg-[#121212] px-1.5">
        <div className="h-[44px] w-[44px] overflow-hidden rounded-full border border-[#9b45fe]">
          <img src={figmaAssets.cardJoshAvatar} alt="Josh" className="h-full w-full object-cover" />
        </div>
        <p className="mt-1.5 text-center text-[9px] font-bold leading-[100%] text-white/85" style={kodeMonoStyle}>
          Josh
        </p>
        <p className="mt-0.5 text-center text-[9px] font-bold leading-[100%] text-white/70" style={kodeMonoStyle}>
          Developer/Frontend
        </p>
        <div className="mt-2 flex justify-center">
          <span
            className="flex h-[16px] w-[59px] items-center justify-center rounded-[5px] bg-white text-center text-[9px] font-bold leading-[100%] text-black"
            style={kodeMonoStyle}
          >
            Connect
          </span>
        </div>
      </div>
    </div>
  );
}

function WorldConnectionsMap() {
  return (
    <div className="mx-auto mt-2 w-full max-w-[984px]">
      <img
        src="/map-for-landing.svg"
        alt="SolPoint world connections map"
        className="block h-auto w-full select-none"
        draggable={false}
      />
    </div>
  );
}

export function LandingPageRedesign() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleFaq = (index: number) => {
    setOpenItems((prev) =>
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
    );
  };

  return (
    <main className="bg-black text-white" style={kodeMonoStyle}>
      <section className="mx-auto w-full max-w-[1440px] px-4 pb-14 pt-[108px] md:px-10 md:pb-20">
        <div className="mx-auto max-w-[912px] text-center">
          <h1 className="text-[29px] font-bold leading-[1.05] text-white md:text-[35px]">
            Find the right connections in minutes
          </h1>
          <p className="mt-3 text-[16px] font-bold leading-tight text-white md:text-[20px]">
            Build meaningful relationships faster across events and everyday networking.
          </p>
        </div>

        <WorldConnectionsMap />

        <BadgeRow className="mx-auto mt-7 max-w-[654px]" />

        <div className="mt-11 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/events"
            className="inline-flex h-[49px] min-w-[194px] items-center justify-center rounded-[7px] bg-white px-4 text-[20px] font-bold leading-none text-black"
          >
            Explore Events
          </Link>
          <Link
            href="/map"
            className="inline-flex h-[49px] min-w-[162px] items-center justify-center rounded-[7px] border border-[#9b45fe] bg-black px-4 text-[20px] font-bold leading-none text-transparent"
            style={{
              backgroundImage: "linear-gradient(90deg,#9b45fe 0%, #00f58d 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
            }}
          >
            Explore Map
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] border-t border-[#2a2a2a] px-4 pt-14 md:px-10 md:pt-20">
        <h2 className="text-center text-[29px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[35px]">
          Simple steps to Find, Connect, and Grow
        </h2>

        <div className="mx-auto mt-10 grid max-w-[954px] gap-6 lg:grid-cols-3">
          {stepCards.map((card) => (
            <article key={card.title} className="h-[270px] rounded-[2px] bg-[#121212] px-[21px] pb-[26px] pt-[23px]">
              <div className="flex items-start gap-3">
                <p className="text-[45px] font-bold leading-none tracking-[-1.35px] text-white">{card.number}</p>
                <h3 className="max-w-[224px] text-[23px] font-bold leading-[1] tracking-[-0.69px] text-white">
                  {card.title}
                </h3>
              </div>

              <p className="mt-7 max-w-[136px] text-[9px] font-bold leading-tight tracking-[-0.27px] text-[#c7c7c7]">
                {card.subtitle}
              </p>

              <div className="mt-7 flex items-end justify-between gap-3">
                <Link
                  href={card.href}
                  className="inline-flex h-[31px] w-[109px] items-center justify-center rounded-[5px] bg-white px-3 text-[12px] font-bold leading-none tracking-[-0.36px] text-black"
                >
                  {card.cta}
                </Link>
                <StepPreview type={card.previewType} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-16 md:px-10 md:pb-32">
        <h2 className="text-center text-[29px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[35px]">
          Frequently Asked Questions
        </h2>

        <div className="mx-auto mt-10 w-full max-w-[849px]">
          {faqItems.map((question, index) => {
            const isOpen = openItems.includes(index);

            return (
              <article key={question} className="border-b border-[#8e8e8e]">
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="flex w-full items-center justify-between gap-3 px-0 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-[20px] font-bold leading-none tracking-[-0.03em] text-white">
                    {question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 flex-shrink-0 text-white transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "overflow-hidden transition-[max-height] duration-200 ease-out",
                    isOpen ? "max-h-12" : "max-h-0"
                  )}
                >
                  <div className="h-6" />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <Footer />
    </main>
  );
}
