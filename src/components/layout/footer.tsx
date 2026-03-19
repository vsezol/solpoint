"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
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

export function Footer() {
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

  return (
    <footer className="border-t border-[#595959] bg-[#101010] pb-20 md:pb-0">
      <div className="mx-auto flex w-full max-w-[980px] flex-col gap-10 px-6 py-10 md:flex-row md:items-start md:px-8 md:py-12">
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:gap-[148px]">
            <div>
              <h3 className="text-[26px] font-bold leading-none tracking-normal text-white" style={kodeMonoStyle}>
                Socials
              </h3>
              <a
                href="https://twitter.com/solpointxyz"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex h-8 w-8 items-center justify-center text-white transition-opacity hover:opacity-80"
                aria-label="SolPoint Twitter"
              >
                <Twitter className="h-7 w-7" />
              </a>
            </div>

            <div>
              <h3 className="text-[26px] font-bold leading-none tracking-normal text-white" style={kodeMonoStyle}>
                Navigation
              </h3>
              <div className="mt-[23px] flex flex-col gap-[17px]">
                <Link
                  href="/events"
                  className="text-[18px] font-bold leading-none tracking-normal text-white hover:text-white/85"
                  style={kodeMonoStyle}
                >
                  Events
                </Link>
                <Link
                  href="/map"
                  className="text-[18px] font-bold leading-none tracking-normal text-white hover:text-white/85"
                  style={kodeMonoStyle}
                >
                  Map
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-[60px] grid gap-6 sm:grid-cols-3 sm:gap-x-[43px]">
            {badges.map((badge) => (
              <article key={badge.title} className="mx-auto flex w-fit flex-col">
                <p
                  className="self-center text-[12px] font-normal leading-none tracking-normal text-white/70"
                  style={kodeMonoStyle}
                >
                  {badge.title}
                </p>
                <div className="mt-[15px] flex items-center gap-[12px]">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/25">
                    <img
                      src={badge.logoSrc}
                      alt={`${badge.nameTop} ${badge.nameBottom} logo`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-[17px] leading-[15px] tracking-normal text-white" style={badge.nameStyle}>
                      {badge.nameTop}
                    </p>
                    <p className="text-[17px] leading-[15px] tracking-normal text-white" style={badge.nameStyle}>
                      {badge.nameBottom}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="w-full md:ml-[102px] md:w-[320px] md:shrink-0">
          <h3 className="text-[26px] font-bold leading-none tracking-normal text-white" style={kodeMonoStyle}>
            Contact &amp; Support
          </h3>
          <form className="mt-4 space-y-4" onSubmit={onSubmitFeedback}>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="name"
              required
              maxLength={120}
              className="h-[65px] w-full rounded-[4px] border border-[#5e5e5e] bg-black px-2.5 text-[16px] font-semibold text-white placeholder:text-[#a4a7ac] outline-none transition-colors duration-200 focus:border-white focus:ring-0 focus-visible:ring-0 md:w-[266px]"
            />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="email"
              required
              maxLength={255}
              className="h-[65px] w-full rounded-[4px] border border-[#5e5e5e] bg-black px-2.5 text-[16px] font-semibold text-white placeholder:text-[#a4a7ac] outline-none transition-colors duration-200 focus:border-white focus:ring-0 focus-visible:ring-0 md:w-[266px]"
            />
            <textarea
              name="message"
              value={form.message}
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              placeholder="message"
              required
              maxLength={2000}
              className="h-[65px] w-full resize-none rounded-[4px] border border-[#5e5e5e] bg-black px-2.5 py-2 text-[16px] font-semibold text-white placeholder:text-[#a4a7ac] outline-none transition-colors duration-200 focus:border-white focus:ring-0 focus-visible:ring-0 md:w-[266px]"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-[44px] w-full md:w-[266px] items-center justify-center rounded-[5px] bg-white text-[25px] font-bold leading-none tracking-normal text-black disabled:cursor-not-allowed disabled:opacity-60"
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

      <div className="border-t border-[#595959]">
        <div className="mx-auto flex w-full max-w-[980px] items-center justify-between px-6 py-4 md:px-8">
          <p className="text-xs text-white/50">&copy; {new Date().getFullYear()} SolPoint. All rights reserved.</p>
          <Link href="/" className="text-xs text-white/70 hover:text-white">
            solpoint.xyz
          </Link>
        </div>
      </div>
    </footer>
  );
}
