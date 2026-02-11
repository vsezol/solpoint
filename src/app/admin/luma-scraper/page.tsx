"use client";

import { useState, useEffect } from "react";
import { Header, Footer } from "@/components/layout";
import { Button, Input, CheckBox } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save, Calendar } from "lucide-react";
import type { ScraperId } from "@/app/api/admin/luma-scraper/route";

type ScraperParams = {
  searchKeywords: string;
  calendarSlugs: string;
  categorySlugs: string;
  locationSlugs: string;
  fetchAttendees: boolean;
  attendeeLimit: number;
  maxEventsTotal: number;
  discoveryLimitPerMode: number;
};

type LexisParams = {
  query: string;
  maxItems: number;
  location: string;
};

const defaultParams: ScraperParams = {
  searchKeywords: "Solana",
  calendarSlugs: "superteam",
  categorySlugs: "",
  locationSlugs: "",
  fetchAttendees: true,
  attendeeLimit: 50,
  maxEventsTotal: 30,
  discoveryLimitPerMode: 50,
};

const defaultLexisParams: LexisParams = {
  query: "Solana",
  maxItems: 50,
  location: "",
};

type OwnParams = { calendarSlug: string; maxEvents: number };
const defaultOwnParams: OwnParams = { calendarSlug: "superteam", maxEvents: 30 };

function parseCommaList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function AdminLumaScraperPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [scraper, setScraper] = useState<ScraperId>("own");
  const [params, setParams] = useState<ScraperParams>(defaultParams);
  const [lexisParams, setLexisParams] = useState<LexisParams>(defaultLexisParams);
  const [ownParams, setOwnParams] = useState<OwnParams>(defaultOwnParams);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    scraper: ScraperId;
    runId?: string | null;
    status: string;
    count: number;
    savedTo: string;
    items: unknown[];
  } | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !user.is_admin)) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setRunning(true);

    try {
      const body =
        scraper === "own"
          ? {
              scraper: "own" as const,
              calendarSlug: ownParams.calendarSlug.trim() || "superteam",
              maxEvents: ownParams.maxEvents || 30,
            }
          : scraper === "lexis"
            ? {
                scraper: "lexis" as const,
                query: lexisParams.query,
                maxItems: lexisParams.maxItems,
                ...((lexisParams.location ?? "").trim() ? { location: (lexisParams.location ?? "").trim() } : {}),
              }
            : {
                scraper: "lukas" as const,
                searchKeywords: parseCommaList(params.searchKeywords),
                calendarSlugs: parseCommaList(params.calendarSlugs),
                categorySlugs: params.categorySlugs ? parseCommaList(params.categorySlugs) : undefined,
                locationSlugs: params.locationSlugs ? parseCommaList(params.locationSlugs) : undefined,
                fetchAttendees: params.fetchAttendees,
                attendeeLimit: params.attendeeLimit || 0,
                maxEventsTotal: params.maxEventsTotal || 30,
                discoveryLimitPerMode: params.discoveryLimitPerMode || 50,
              };

      const res = await fetch("/api/admin/luma-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scraper failed");
    } finally {
      setRunning(false);
    }
  };

  if (!user?.is_admin && !authLoading) return null;

  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-[var(--color-background)]">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4"
              onClick={() => router.push("/admin")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>

            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              Luma Scraper
            </h1>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Own (Playwright), Lexis, or Lukas. Results saved to <code className="bg-[var(--color-surface)] px-1 rounded">data/luma-scraper-results/</code>. For Own: run <code className="bg-[var(--color-surface)] px-1 rounded">npm run luma-scraper:login</code> once to save session.
            </p>

            <form
              onSubmit={handleSubmit}
              className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  Scraper
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scraper"
                      checked={scraper === "own"}
                      onChange={() => setScraper("own")}
                      className="rounded-full border-[var(--color-surface-border)]"
                    />
                    <span className="text-[var(--color-text-primary)]">Own (Playwright)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scraper"
                      checked={scraper === "lexis"}
                      onChange={() => setScraper("lexis")}
                      className="rounded-full border-[var(--color-surface-border)]"
                    />
                    <span className="text-[var(--color-text-primary)]">Lexis (lu-ma-scraper)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scraper"
                      checked={scraper === "lukas"}
                      onChange={() => setScraper("lukas")}
                      className="rounded-full border-[var(--color-surface-border)]"
                    />
                    <span className="text-[var(--color-text-primary)]">Lukas (apify-luma-scraper)</span>
                  </label>
                </div>
                <p className="text-[var(--color-text-secondary)] text-xs mt-1">
                  {scraper === "own"
                    ? "Local Playwright — calendar slug + max events (session from luma-scraper:login)"
                    : scraper === "lexis"
                      ? "lexis-solutions/lu-ma-scraper — query + maxItems"
                      : "lukas_bekr/apify-luma-scraper — keywords, calendars, attendees"}
                </p>
              </div>

              {scraper === "own" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Calendar slug
                    </label>
                    <Input
                      value={ownParams.calendarSlug}
                      onChange={(e) => setOwnParams((p) => ({ ...p, calendarSlug: e.target.value }))}
                      placeholder="superteam"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Max events
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={ownParams.maxEvents}
                      onChange={(e) => setOwnParams((p) => ({ ...p, maxEvents: Number(e.target.value) || 30 }))}
                    />
                  </div>
                </>
              ) : scraper === "lexis" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Search query
                    </label>
                    <Input
                      value={lexisParams.query}
                      onChange={(e) => setLexisParams((p) => ({ ...p, query: e.target.value }))}
                      placeholder="Solana, party, crypto"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Max items
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={lexisParams.maxItems}
                      onChange={(e) => setLexisParams((p) => ({ ...p, maxItems: Number(e.target.value) || 50 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Location (optional)
                    </label>
                    <Input
                      value={lexisParams.location}
                      onChange={(e) => setLexisParams((p) => ({ ...p, location: e.target.value }))}
                      placeholder="e.g. San Francisco, online"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Search keywords (comma-separated)
                    </label>
                    <Input
                      value={params.searchKeywords}
                      onChange={(e) => setParams((p) => ({ ...p, searchKeywords: e.target.value }))}
                      placeholder="Solana, crypto, web3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Calendar slugs (comma-separated, e.g. superteam = lu.ma/superteam)
                    </label>
                    <Input
                      value={params.calendarSlugs}
                      onChange={(e) => setParams((p) => ({ ...p, calendarSlugs: e.target.value }))}
                      placeholder="superteam"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Category slugs (optional, comma-separated)
                    </label>
                    <Input
                      value={params.categorySlugs}
                      onChange={(e) => setParams((p) => ({ ...p, categorySlugs: e.target.value }))}
                      placeholder="crypto, tech"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Location slugs (optional, comma-separated)
                    </label>
                    <Input
                      value={params.locationSlugs}
                      onChange={(e) => setParams((p) => ({ ...p, locationSlugs: e.target.value }))}
                      placeholder="online"
                    />
                  </div>

                  <div className="flex flex-wrap gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                        Attendee limit per event (0 = no limit)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={params.attendeeLimit}
                        onChange={(e) => setParams((p) => ({ ...p, attendeeLimit: Number(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                        Max events total
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={params.maxEventsTotal}
                        onChange={(e) => setParams((p) => ({ ...p, maxEventsTotal: Number(e.target.value) || 30 }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                        Discovery limit per mode
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={params.discoveryLimitPerMode}
                        onChange={(e) => setParams((p) => ({ ...p, discoveryLimitPerMode: Number(e.target.value) || 50 }))}
                      />
                    </div>
                  </div>

                  <CheckBox
                    type="checkbox"
                    label="Fetch attendees (with social profiles)"
                    checked={params.fetchAttendees}
                    onChange={(e) => setParams((p) => ({ ...p, fetchAttendees: e.target.checked }))}
                  />
                </>
              )}

              {error && (
                <p className="text-sm text-[var(--color-error)]">{error}</p>
              )}

              <Button
                type="submit"
                disabled={running}
                isLoading={running}
                className="w-full sm:w-auto"
              >
                {running ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running scraper…
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Run Luma Scraper
                  </>
                )}
              </Button>
            </form>

            {result && (
              <div className="mt-6 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  Result
                </h2>
                <p className="text-[var(--color-text-secondary)] text-sm mb-1">
                  Scraper: <code className="bg-[var(--color-background)] px-1 rounded">{result.scraper}</code>
                </p>
                {result.runId != null && (
                  <p className="text-[var(--color-text-secondary)] text-sm mb-1">
                    Run ID: <code className="bg-[var(--color-background)] px-1 rounded">{result.runId}</code>
                  </p>
                )}
                <p className="text-[var(--color-text-secondary)] text-sm mb-1">
                  Status: <code className="bg-[var(--color-background)] px-1 rounded">{result.status}</code>
                </p>
                <p className="text-[var(--color-text-primary)] font-medium mb-1">
                  Events found: {result.count}
                </p>
                <p className="text-[var(--color-text-secondary)] text-sm break-all">
                  Saved to: <code className="bg-[var(--color-background)] px-1 rounded text-xs">{result.savedTo}</code>
                </p>
                {result.items.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-[var(--color-primary)]">
                      Preview first event (JSON)
                    </summary>
                    <pre className="mt-2 p-3 bg-[var(--color-background)] rounded text-xs overflow-auto max-h-60">
                      {JSON.stringify(result.items[0], null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
