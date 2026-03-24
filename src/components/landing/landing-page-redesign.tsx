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

/** Step preview mini-cards: 116×112, 4px radius, 1px gradient rim (Figma). */
const stepPreviewOuterClassName =
  "h-[112px] w-[116px] shrink-0 rounded-[4px] bg-[linear-gradient(135deg,#9B45FE_0%,#00F68B_100%)] p-px";

/** Single caption line inside previews (not the people name/role pair). */
const stepPreviewCaptionClassName =
  "text-[9px] font-bold leading-[100%] tracking-[-0.03em]";

/** Step preview assets in `public/icons` (PNG + SVG per exports). */
const stepPreviewAssets = {
  profileDaniel: "/icons/monke.png",
  peopleJosh: "/icons/josh-nft.png",
  eventAccelerateUsa: "/icons/accelerateUSA.svg",
  eventBreakpoint: "/icons/breakpoint.svg",
  eventMtnDao: "/icons/mnt_dao.svg",
} as const;

const badges = [
  {
    title: "Member",
    logoSrc: "/monkedao.jpg",
    nameTop: "Monke",
    nameBottom: "DAO",
    nameStyle: { fontFamily: "var(--font-lalezar), cursive", fontWeight: 400 } as const,
    logoFrame: "circle" as const,
    logoImgClassName: "h-full w-full object-cover",
  },
  {
    title: "Supported by",
    logoSrc: "/icons/superteamlogo.svg",
    nameTop: "",
    nameBottom: "",
    nameStyle: { fontFamily: "var(--font-iceland), sans-serif", fontWeight: 400 } as const,
    logoFrame: "inline" as const,
    logoImgClassName:
      "h-[14px] w-auto max-w-[72px] object-contain object-center sm:h-[18px] sm:max-w-[96px] md:h-[22px] md:max-w-[118px]",
  },
  {
    title: "Alumni",
    logoSrc: "/encodeclb.jpg",
    nameTop: "Encode",
    nameBottom: "Club",
    nameStyle: { fontFamily: "var(--font-iceland), sans-serif", fontWeight: 400 } as const,
    logoFrame: "circle" as const,
    logoImgClassName: "h-full w-full object-cover",
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
    <div
      className={cn(
        "flex w-full flex-row flex-nowrap items-stretch justify-center gap-2 self-center sm:gap-4 md:gap-[105px]",
        className
      )}
    >
      {badges.map((badge) => {
        const alt =
          [badge.nameTop, badge.nameBottom].filter(Boolean).join(" ").trim() || badge.title;
        const hasNames = Boolean(badge.nameTop || badge.nameBottom);
        return (
          <article
            key={badge.title}
            className="flex h-[64px] min-w-0 flex-1 flex-col rounded-[8px] border border-[#303030] px-1.5 pt-1.5 pb-1.5 sm:h-[75px] sm:max-w-[148px] sm:flex-none sm:rounded-[11px] sm:px-[14px] sm:pt-2 sm:pb-2 md:flex-initial"
          >
            <p
              className="shrink-0 text-center text-[8px] font-normal leading-[100%] text-white sm:text-[10px] md:text-[12px]"
              style={kodeMonoStyle}
            >
              {badge.title}
            </p>
            <div className="mt-1 flex min-h-0 flex-1 items-center justify-center gap-1 sm:mt-2 sm:gap-2">
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center",
                  badge.logoFrame === "circle" &&
                    "h-6 w-6 overflow-hidden rounded-full border border-white/25 sm:h-7 sm:w-7 md:h-8 md:w-8"
                )}
              >
                <img src={badge.logoSrc} alt={`${alt} logo`} className={badge.logoImgClassName} />
              </div>
              {hasNames ? (
                <div className="flex min-w-0 flex-col items-center justify-center gap-0 text-center leading-none sm:flex-1 sm:items-start sm:text-left">
                  {badge.nameTop ? (
                    <p
                      className="text-center text-[10px] font-bold leading-[0.95] text-white sm:text-left sm:text-[13px] md:text-[15px]"
                      style={badge.nameStyle}
                    >
                      {badge.nameTop}
                    </p>
                  ) : null}
                  {badge.nameBottom ? (
                    <p
                      className="text-center text-[10px] font-bold leading-[0.95] text-white sm:text-left sm:text-[13px] md:text-[15px]"
                      style={badge.nameStyle}
                    >
                      {badge.nameBottom}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function StepPreview({ type }: { type: (typeof stepCards)[number]["previewType"] }) {
  if (type === "profile") {
    return (
      <div className={stepPreviewOuterClassName}>
        <div className="relative h-full w-full overflow-hidden rounded-[3px] bg-[#121212]">
          {/* Map at full natural width — Americas left edge, Japan right edge */}
          <img
            src="/mapbase.svg"
            alt=""
            aria-hidden
            className="absolute inset-x-0 w-full opacity-65"
            style={{ top: "50px" }}
          />
          {/* Foreground: SolPoint → avatar → Daniel pushed to bottom */}
          <div className="relative z-10 flex h-full flex-col items-center p-1.5">
            <p
              className={cn("text-center text-white", stepPreviewCaptionClassName)}
              style={kodeMonoStyle}
            >
              SolPoint
            </p>
            <div className="mt-1 h-[46px] w-[46px] overflow-hidden rounded-full border border-[#00f58d]">
              <img
                src={stepPreviewAssets.profileDaniel}
                alt="Daniel"
                className="h-full w-full object-cover"
              />
            </div>
            <p
              className={cn("mt-auto text-center text-white", stepPreviewCaptionClassName)}
              style={kodeMonoStyle}
            >
              Daniel
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (type === "events") {
    return (
      <div className={stepPreviewOuterClassName}>
        <div className="flex h-full w-full flex-col rounded-[3px] bg-[#121212] px-1 pb-2 pt-1.5">
          {/* Icons + text grouped together, pushed to bottom */}
          <div className="mt-auto flex flex-col gap-2">
            {/* Center event raised; side icons smaller and aligned to bottom */}
            <div className="relative flex h-[72px] w-full items-end justify-between px-1">
              <div className="h-[30px] w-[30px] shrink-0 overflow-hidden rounded-[9px] border border-[#2a2a2a] bg-[#131313]">
                <img
                  src={stepPreviewAssets.eventMtnDao}
                  alt=""
                  className="h-full w-full object-cover opacity-80"
                />
              </div>
              <div className="absolute left-1/2 top-0 h-[45px] w-[45px] -translate-x-1/2 overflow-hidden rounded-[9px] border border-[#2a2a2a]">
                <img
                  src={stepPreviewAssets.eventAccelerateUsa}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="h-[30px] w-[30px] shrink-0 overflow-hidden rounded-[9px] border border-[#2a2a2a] bg-[#131313]">
                <img
                  src={stepPreviewAssets.eventBreakpoint}
                  alt=""
                  className="h-full w-full object-cover opacity-80"
                />
              </div>
            </div>
            <p
              className="block w-full min-w-0 whitespace-nowrap text-center text-[9px] font-bold leading-[100%] text-white"
              style={{ ...kodeMonoStyle, letterSpacing: "-3%" }}
            >
              Solana accelerate USA
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={stepPreviewOuterClassName}>
      <div className="flex h-full w-full flex-col items-center justify-center rounded-[3px] bg-[#121212] px-1.5">
        <div className="h-[45px] w-[45px] overflow-hidden rounded-full border border-[#9b45fe]">
          <img
            src={stepPreviewAssets.peopleJosh}
            alt="Josh"
            className="h-full w-full object-cover"
          />
        </div>
        <p
          className="mt-1.5 text-center text-[9px] font-bold leading-[100%] text-white"
          style={kodeMonoStyle}
        >
          Josh
        </p>
        <p
          className="mt-0.5 text-center text-[9px] font-bold leading-[100%] text-[#C7C7C7]"
          style={kodeMonoStyle}
        >
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
        src="/map-base%203.svg"
        alt="Illustration of global SolPoint network connections on a world map"
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
          <h1 className="mt-[89px] text-[29px] font-bold leading-[1.05] text-white md:text-[35px]">
            Find the right connections in minutes
          </h1>
          <p className="mt-3 text-[16px] font-bold leading-tight text-white md:text-[20px]">
            Build meaningful relationships faster across events and everyday networking.
          </p>
        </div>

        <WorldConnectionsMap />

        <BadgeRow className="mx-auto mt-7 w-full max-w-[min(100%,380px)] sm:max-w-[654px]" />

        <div className="mx-auto mt-8 flex w-full max-w-[340px] flex-row flex-nowrap items-stretch justify-center gap-2 sm:mt-11 sm:max-w-none sm:gap-[105px]">
          <Link
            href="/events"
            className="inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-[6px] border border-white bg-white px-[0.35rem] text-[12px] font-bold leading-none text-black transition-colors duration-200 ease-out hover:bg-black hover:text-white sm:h-[49px] sm:min-w-[194px] sm:flex-none sm:rounded-[7px] sm:px-4 sm:text-[20px]"
          >
            Explore Events
          </Link>
          <Link
            href="/map"
            className="group inline-flex h-10 min-w-0 flex-1 items-stretch rounded-[6px] p-px sm:h-[49px] sm:min-w-[162px] sm:flex-none sm:rounded-[7px]"
            style={{
              background: "linear-gradient(90deg, #9b45fe 0%, #00f58d 100%)",
            }}
          >
            <span
              className="flex min-w-0 flex-1 items-center justify-center rounded-[5px] bg-black px-[0.35rem] text-center text-[12px] font-bold leading-[100%] tracking-normal text-white transition-colors duration-200 ease-out group-hover:bg-transparent sm:min-w-[160px] sm:rounded-[6px] sm:px-4 sm:text-[20px]"
              style={kodeMonoStyle}
            >
              Explore Map
            </span>
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-4 pt-14 md:px-10 md:pt-20">
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

              <p className="mt-7 max-w-[136px] text-[11px] font-bold leading-tight tracking-[-0.27px] text-[#c7c7c7]">
                {card.subtitle}
              </p>

              <div className="mt-7 flex items-end justify-between gap-3">
                <Link
                  href={card.href}
                  className="inline-flex h-[31px] w-[109px] shrink-0 items-center justify-center rounded-[5px] border border-white bg-white text-center text-[12px] font-bold leading-[100%] tracking-[-0.03em] text-black transition-colors duration-200 ease-out hover:bg-black hover:text-white"
                  style={kodeMonoStyle}
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
