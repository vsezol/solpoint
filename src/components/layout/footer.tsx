"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isMobileBottomNavHidden } from "@/lib/mobile-bottom-nav";
import { Twitter } from "lucide-react";

interface FeedbackFormState {
  name: string;
  email: string;
  message: string;
}

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

const kodeMonoStyle = { fontFamily: "var(--font-kode-mono), monospace" } as const;
const contactFieldBaseClass =
  "footer-contact-field w-full rounded-[4px] border border-[#5e5e5e] bg-black px-2.5 text-[14px] font-semibold text-white placeholder:text-[#a4a7ac] outline-none ring-0 transition-[border-color] duration-200 focus:border-white focus:outline-none focus:ring-0 focus:ring-offset-0 md:w-[266px]";

const FOOTER_CONTACT_HASH = "#footer-contact";

export function Footer() {
  const pathname = usePathname();
  const messageFieldRef = useRef<HTMLTextAreaElement>(null);
  const [form, setForm] = useState<FeedbackFormState>({ name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState("");

  const onSubmitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setSubmitError("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: form.message,
          source: "footer_contact_support",
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setSubmitStatus("error");
        setSubmitError(
          payload && typeof payload.error === "string" ? payload.error : "Could not send your message."
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

  useEffect(() => {
    const focusMessageField = () => {
      if (typeof window === "undefined" || window.location.hash !== FOOTER_CONTACT_HASH) {
        return;
      }
      const el = messageFieldRef.current;
      if (!el) return;
      window.setTimeout(() => {
        el.focus({ preventScroll: true });
      }, 450);
    };

    focusMessageField();
    window.addEventListener("hashchange", focusMessageField);
    return () => window.removeEventListener("hashchange", focusMessageField);
  }, []);

  return (
    <footer
      className={cn(
        "bg-[#101010] md:pb-0",
        isMobileBottomNavHidden(pathname) ? "pb-8" : "pb-20"
      )}
    >
      <div className="mx-auto flex w-full max-w-[980px] flex-col gap-8 px-4 py-7 sm:px-6 sm:py-10 md:flex-row md:items-start md:px-8 md:py-12">
        <div className="flex min-w-0 flex-1 flex-col gap-6 sm:gap-8">
          <div className="flex flex-row justify-center gap-8 sm:justify-start sm:gap-[148px]">
            <div>
              <h3 className="text-[18px] font-bold leading-none tracking-normal text-white sm:text-[26px]" style={kodeMonoStyle}>
                Socials
              </h3>
              <a
                href="https://twitter.com/solpointxyz"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex h-7 w-7 items-center justify-center text-white transition-opacity hover:opacity-80 sm:mt-4 sm:h-8 sm:w-8"
                aria-label="SolPoint Twitter"
              >
                <Twitter className="h-6 w-6 sm:h-7 sm:w-7" />
              </a>
            </div>

            <div>
              <h3 className="text-[18px] font-bold leading-none tracking-normal text-white sm:text-[26px]" style={kodeMonoStyle}>
                Navigation
              </h3>
              <div className="mt-4 flex flex-col gap-3 sm:mt-[23px] sm:gap-[17px]">
                <Link
                  href="/events"
                  className="text-[14px] font-bold leading-none tracking-normal text-white hover:text-white/85 sm:text-[18px]"
                  style={kodeMonoStyle}
                >
                  Events
                </Link>
                <Link
                  href="/map"
                  className="text-[14px] font-bold leading-none tracking-normal text-white hover:text-white/85 sm:text-[18px]"
                  style={kodeMonoStyle}
                >
                  Map
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-x-[43px]">
            {badges.map((badge) => (
              <article key={badge.title} className="mx-auto flex w-fit flex-col sm:mx-0">
                <p
                  className="self-center text-[10px] font-normal leading-none tracking-normal text-white/70 sm:text-[12px]"
                  style={kodeMonoStyle}
                >
                  {badge.title}
                </p>
                <div className="mt-2 flex items-center gap-2 sm:mt-[15px] sm:gap-[12px]">
                  <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/25 sm:h-10 sm:w-10">
                    <img
                      src={badge.logoSrc}
                      alt={`${badge.nameTop} ${badge.nameBottom} logo`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-[12px] leading-[13px] tracking-normal text-white sm:text-[17px] sm:leading-[15px]" style={badge.nameStyle}>
                      {badge.nameTop}
                    </p>
                    <p className="text-[12px] leading-[13px] tracking-normal text-white sm:text-[17px] sm:leading-[15px]" style={badge.nameStyle}>
                      {badge.nameBottom}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div
          id="footer-contact"
          className="scroll-mt-24 w-full px-5 md:ml-[102px] md:w-[320px] md:shrink-0 md:px-0"
        >
          <h3 className="text-[18px] font-bold leading-none tracking-normal text-white sm:text-[26px]" style={kodeMonoStyle}>
            Contact &amp; Support
          </h3>
          <form className="mt-3 space-y-3 sm:mt-4 sm:space-y-4" onSubmit={onSubmitFeedback}>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="name"
              required
              maxLength={120}
              className={`h-[50px] md:h-[30px] ${contactFieldBaseClass} sm:text-[16px]`}
              style={kodeMonoStyle}
            />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="email"
              required
              maxLength={255}
              className={`h-[50px] md:h-[30px] ${contactFieldBaseClass} sm:text-[16px]`}
              style={kodeMonoStyle}
            />
            <textarea
              ref={messageFieldRef}
              name="message"
              value={form.message}
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              placeholder="message"
              required
              maxLength={2000}
              className={`h-[65px] resize-none py-2 ${contactFieldBaseClass} sm:text-[16px]`}
              style={kodeMonoStyle}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-[38px] w-full items-center justify-center rounded-[5px] bg-white text-[18px] font-bold leading-none tracking-normal text-black disabled:cursor-not-allowed disabled:opacity-60 sm:h-[44px] sm:text-[25px] md:w-[266px]"
              style={kodeMonoStyle}
            >
              {isSubmitting ? "SENDING..." : "SEND"}
            </button>
          </form>
          {submitStatus === "success" && (
            <p className="mt-3 text-[13px] font-bold text-[#00f58d]">Message sent. Thank you.</p>
          )}
          {submitStatus === "error" && <p className="mt-3 text-[13px] font-bold text-[#ff6b6b]">{submitError}</p>}
        </div>
      </div>
    </footer>
  );
}
