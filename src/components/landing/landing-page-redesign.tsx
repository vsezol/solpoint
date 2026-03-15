/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
    nameTop: "Monke",
    nameBottom: "DAO",
    circleClass: "bg-[#1f6f47]",
    mark: "M",
  },
  {
    title: "Supported by",
    nameTop: "Superteam",
    nameBottom: "Kazakhstan",
    circleClass: "bg-[#11b8dc]",
    mark: "S+",
  },
  {
    title: "Alumni",
    nameTop: "Encode",
    nameBottom: "Club",
    circleClass: "bg-gradient-to-br from-[#2db2ff] to-[#1b29ff]",
    mark: "e",
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

interface FeedbackFormState {
  name: string;
  email: string;
  message: string;
}

function BadgeRow({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-3", className)}>
      {badges.map((badge) => (
        <article
          key={badge.title}
          className="rounded-[11px] border border-[#303030] bg-black px-3 py-2.5"
        >
          <p className="text-[12px] leading-[1.1] text-white/85" style={kodeMonoStyle}>
            {badge.title}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-[17px] font-semibold text-white",
                badge.circleClass
              )}
              style={kodeMonoStyle}
            >
              {badge.mark}
            </div>
            <div>
              <p className="text-[17px] font-bold leading-[0.95] text-white" style={kodeMonoStyle}>
                {badge.nameTop}
              </p>
              <p className="text-[17px] font-bold leading-[0.95] text-white" style={kodeMonoStyle}>
                {badge.nameBottom}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function FooterBadgeStrip() {
  return (
    <div className="grid grid-cols-3 gap-6">
      {badges.map((badge) => (
        <article key={`footer-${badge.title}`}>
          <p className="text-[12px] leading-[1.1] text-white/85" style={kodeMonoStyle}>
            {badge.title}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-[17px] font-semibold text-white",
                badge.circleClass
              )}
              style={kodeMonoStyle}
            >
              {badge.mark}
            </div>
            <div>
              <p className="text-[17px] font-bold leading-[0.95] text-white" style={kodeMonoStyle}>
                {badge.nameTop}
              </p>
              <p className="text-[17px] font-bold leading-[0.95] text-white" style={kodeMonoStyle}>
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
      <div className="h-[112px] w-[116px] rounded-[4px] bg-[linear-gradient(135deg,#9B45FE_0%,#00F68B_100%)] p-[1px]">
        <div className="h-full w-full rounded-[3px] bg-[#121212] p-1.5">
          <p className="text-center text-[9px] leading-none tracking-[-0.27px] text-white/85" style={kodeMonoStyle}>
            SolPoint
          </p>
          <div className="mx-auto mt-1 h-[50px] w-[50px] overflow-hidden rounded-full border border-[#00f58d]">
            <img src={figmaAssets.cardDanielAvatar} alt="Daniel" className="h-full w-full object-cover" />
          </div>
          <div className="mx-auto mt-1 h-[12px] w-[84px] overflow-hidden">
            <img src="/mapbase.svg" alt="" className="h-full w-full object-cover" aria-hidden />
          </div>
          <p className="mt-2 text-center text-[9px] leading-none tracking-[-0.27px] text-white/85" style={kodeMonoStyle}>
            Daniel
          </p>
        </div>
      </div>
    );
  }

  if (type === "events") {
    return (
      <div className="h-[112px] w-[116px] rounded-[4px] bg-[linear-gradient(135deg,#9B45FE_0%,#00F68B_100%)] p-[1px]">
        <div className="h-full w-full rounded-[3px] bg-[#121212] p-1.5">
          <div className="mt-1 flex items-center justify-center gap-1.5">
            <div className="h-[30px] w-[30px] overflow-hidden rounded-md border border-[#2a2a2a] bg-[#131313]">
              <img
                src={figmaAssets.cardEventMtndao}
                alt="Event icon"
                className="h-full w-full object-cover opacity-85"
              />
            </div>
            <div className="h-[30px] w-[30px] overflow-hidden rounded-md border border-[#2a2a2a] bg-[#131313]">
              <img
                src={figmaAssets.cardEventBreakpoint}
                alt="Event icon"
                className="h-full w-full object-cover opacity-85"
              />
            </div>
          </div>
          <div className="mt-1 h-[45px] w-[45px] overflow-hidden rounded-[9px] border border-[#2a2a2a]">
            <img src={figmaAssets.cardEventMiami} alt="Miami event" className="h-full w-full object-cover" />
          </div>
          <p className="mt-2 text-[9px] leading-[1.05] tracking-[-0.27px] text-white/90" style={kodeMonoStyle}>
            Solana accelerate USA
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[112px] w-[116px] rounded-[4px] bg-[linear-gradient(135deg,#9B45FE_0%,#00F68B_100%)] p-[1px]">
      <div className="h-full w-full rounded-[3px] bg-[#121212] p-1.5">
        <div className="mx-auto h-[45px] w-[45px] overflow-hidden rounded-full border border-[#9b45fe]">
          <img src={figmaAssets.cardJoshAvatar} alt="Josh" className="h-full w-full object-cover" />
        </div>
        <p className="mt-1.5 text-center text-[9px] leading-none text-white/85" style={kodeMonoStyle}>
          Josh
        </p>
        <p className="mt-0.5 text-center text-[9px] leading-[1.05] text-white/70" style={kodeMonoStyle}>
          Developer/Frontend
        </p>
        <div className="mt-1 flex justify-center">
          <span
            className="rounded-[5px] bg-white px-2 py-0.5 text-[9px] leading-none text-black"
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
  const [form, setForm] = useState<FeedbackFormState>({ name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState("");

  const toggleFaq = (index: number) => {
    setOpenItems((prev) =>
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
    );
  };

  const onSubmitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setSubmitError("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: form.message,
          source: "landing_contact_support",
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setSubmitStatus("error");
        setSubmitError(
          payload && typeof payload.error === "string"
            ? payload.error
            : "Could not send your message."
        );
        return;
      }

      setSubmitStatus("success");
      setForm({ name: "", email: "", message: "" });
    } catch {
      setSubmitStatus("error");
      setSubmitError("Could not send your message.");
    } finally {
      setIsSubmitting(false);
    }
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

      <section className="border-t border-[#595959] bg-[#101010]">
        <div className="mx-auto grid w-full max-w-[860px] gap-10 px-6 py-12 md:grid-cols-[220px_170px_266px] md:px-8 md:py-14">
          <div>
            <h3 className="text-[26px] font-bold leading-none text-white">Socials</h3>
            <a
              href="https://twitter.com/solpointxyz"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex h-8 w-8 items-center justify-center rounded border border-transparent text-white transition-colors hover:border-white/30"
              aria-label="SolPoint Twitter"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
                <path d="M18.901 1.153h3.68l-8.043 9.191L24 22.847h-7.406l-5.804-7.59-6.639 7.59H.468l8.603-9.83L0 1.154h7.594l5.247 6.932L18.9 1.153Zm-1.291 19.492h2.04L6.486 3.24H4.298L17.61 20.645Z" />
              </svg>
            </a>
          </div>

          <div>
            <h3 className="text-[26px] font-bold leading-none text-white">Navigation</h3>
            <div className="mt-4 flex flex-col gap-3">
              <Link href="/events" className="text-[18px] font-bold text-white hover:text-white/85">
                Events
              </Link>
              <Link href="/map" className="text-[18px] font-bold text-white hover:text-white/85">
                Map
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-[26px] font-bold leading-none text-white">Contact &amp; Support</h3>
            <form className="mt-4 space-y-4" onSubmit={onSubmitFeedback}>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="name"
                required
                maxLength={120}
                className="h-[30px] w-full rounded-[4px] border border-[#5e5e5e] bg-black px-2.5 text-[14px] font-bold text-white placeholder:text-[#a4a7ac] outline-none focus:border-[#00f58d]"
              />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="email"
                required
                maxLength={255}
                className="h-[30px] w-full rounded-[4px] border border-[#5e5e5e] bg-black px-2.5 text-[14px] font-bold text-white placeholder:text-[#a4a7ac] outline-none focus:border-[#00f58d]"
              />
              <textarea
                name="message"
                value={form.message}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                placeholder="message"
                required
                maxLength={2000}
                className="h-[65px] w-full resize-none rounded-[4px] border border-[#5e5e5e] bg-black px-2.5 py-2 text-[14px] font-bold text-white placeholder:text-[#a4a7ac] outline-none focus:border-[#00f58d]"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-[44px] w-full items-center justify-center rounded-[5px] bg-white text-[25px] font-bold leading-none text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "SENDING..." : "SEND"}
              </button>
            </form>
            {submitStatus === "success" && (
              <p className="mt-3 text-[13px] font-bold text-[#00f58d]">
                Message sent. Thank you.
              </p>
            )}
            {submitStatus === "error" && (
              <p className="mt-3 text-[13px] font-bold text-[#ff6b6b]">
                {submitError}
              </p>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[860px] px-6 pb-12 md:px-8">
          <div className="max-w-[520px]">
            <FooterBadgeStrip />
          </div>
        </div>
      </section>
    </main>
  );
}
