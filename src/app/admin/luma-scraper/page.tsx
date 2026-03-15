"use client";

import { useState, useEffect, useCallback } from "react";
import { Header, Footer } from "@/components/layout";
import { Button, Input, CheckBox } from "@/components/ui";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Save, Calendar, RefreshCw, AlertCircle, CheckCircle, MapPin, ImagePlus, Clock, Star } from "lucide-react";
import type { ScraperId } from "@/app/api/admin/luma-scraper/route";

type RequiredVerificationEvent = {
  id: string;
  name: string | null;
  slug: string | null;
  start_date: string | null;
  description: string | null;
  image_url: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  luma_link: string | null;
  luma_event_id: string | null;
};

type MajorEventAdminItem = {
  id: string;
  name: string | null;
  slug: string | null;
  image_url: string | null;
  city: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  attendees_count: number | null;
  visibility: "public" | "vip_only";
  is_major: boolean;
};

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

type OwnParams = { calendarSlug: string; maxEvents: number; tag: string; parseGuests: boolean };
const defaultOwnParams: OwnParams = { calendarSlug: "superteam", maxEvents: 30, tag: "", parseGuests: false };

type LumaWorkflowType = "full_pipeline" | "attendees_only";

type LumaWorkflowConfig = {
  id: string;
  workflow_type: LumaWorkflowType;
  schedule_type: string;
  run_at_hour_utc: number | null;
  run_at_minute: number | null;
  cron_expression: string | null;
  parse_guests: boolean | null;
  max_events: number | null;
  calendar_slug: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

function parseCommaList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function WorkflowConfigBlocks({
  configs,
  onSaved,
}: {
  configs: LumaWorkflowConfig[];
  onSaved: () => void;
}) {
  const fullConfig = configs.find((c) => c.workflow_type === "full_pipeline");
  const attendeesConfig = configs.find((c) => c.workflow_type === "attendees_only");

  return (
    <div className="space-y-6">
      <WorkflowConfigForm
        key={`full_pipeline-${fullConfig?.id ?? "new"}`}
        title="Full pipeline"
        description="Scrape → transfer → enrich locations → enrich timezones → save images (cron runs transfer, enrich-locations, enrich-timezones, save-images)."
        workflowType="full_pipeline"
        config={fullConfig ?? null}
        onSaved={onSaved}
        showParseGuests
      />
      <WorkflowConfigForm
        key={`attendees_only-${attendeesConfig?.id ?? "new"}`}
        title="Attendees only"
        description="Update attendees for existing events (pipeline not implemented yet)."
        workflowType="attendees_only"
        config={attendeesConfig ?? null}
        onSaved={onSaved}
        showParseGuests={false}
      />
    </div>
  );
}

function WorkflowConfigForm({
  title,
  description,
  workflowType,
  config,
  onSaved,
  showParseGuests,
}: {
  title: string;
  description: string;
  workflowType: LumaWorkflowType;
  config: LumaWorkflowConfig | null;
  onSaved: () => void;
  showParseGuests: boolean;
}) {
  const [scheduleType, setScheduleType] = useState<"daily" | "cron">(config?.schedule_type === "cron" ? "cron" : "daily");
  const [runAtHourUtc, setRunAtHourUtc] = useState<string>(config?.run_at_hour_utc != null ? String(config.run_at_hour_utc) : "3");
  const [runAtMinute, setRunAtMinute] = useState<string>(config?.run_at_minute != null ? String(config.run_at_minute) : "0");
  const [cronExpression, setCronExpression] = useState<string>(config?.cron_expression ?? "0 3 * * *");
  const [parseGuests, setParseGuests] = useState<boolean>(config?.parse_guests ?? false);
  const [maxEvents, setMaxEvents] = useState<string>(config?.max_events != null ? String(config.max_events) : "");
  const [calendarSlug, setCalendarSlug] = useState<string>(config?.calendar_slug ?? "");
  const [enabled, setEnabled] = useState<boolean>(config?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const payload = {
        schedule_type: scheduleType,
        run_at_hour_utc: scheduleType === "daily" ? (runAtHourUtc === "" ? null : parseInt(runAtHourUtc, 10)) : null,
        run_at_minute: runAtMinute === "" ? null : parseInt(runAtMinute, 10) || null,
        cron_expression: scheduleType === "cron" ? cronExpression.trim() || null : null,
        parse_guests: showParseGuests ? parseGuests : null,
        max_events: maxEvents === "" ? null : parseInt(maxEvents, 10) || null,
        calendar_slug: calendarSlug.trim() || null,
        enabled,
      };
      if (config) {
        const res = await fetch(`/api/admin/luma-config/${config.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");
      } else {
        const res = await fetch("/api/admin/luma-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workflow_type: workflowType, ...payload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Create failed");
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-[var(--color-surface-border)] rounded-lg p-4 bg-[var(--color-background)]">
      <h3 className="text-base font-medium text-[var(--color-text-primary)] mb-1">{title}</h3>
      <p className="text-[var(--color-text-secondary)] text-xs mb-3">{description}</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`schedule-${workflowType}`}
              checked={scheduleType === "daily"}
              onChange={() => setScheduleType("daily")}
              className="rounded-full border-[var(--color-surface-border)]"
            />
            <span className="text-[var(--color-text-primary)] text-sm">Daily</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`schedule-${workflowType}`}
              checked={scheduleType === "cron"}
              onChange={() => setScheduleType("cron")}
              className="rounded-full border-[var(--color-surface-border)]"
            />
            <span className="text-[var(--color-text-primary)] text-sm">Cron</span>
          </label>
        </div>
        {scheduleType === "daily" ? (
          <div className="flex gap-2 items-center flex-wrap">
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-0.5">Hour (UTC)</label>
              <Input
                type="number"
                min={0}
                max={23}
                value={runAtHourUtc}
                onChange={(e) => setRunAtHourUtc(e.target.value)}
                className="w-16"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-0.5">Minute</label>
              <Input
                type="number"
                min={0}
                max={59}
                value={runAtMinute}
                onChange={(e) => setRunAtMinute(e.target.value)}
                className="w-16"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-0.5">Cron expression</label>
            <Input
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              placeholder="0 3 * * *"
            />
          </div>
        )}
        {showParseGuests && (
          <CheckBox
            id={`parse-guests-${workflowType}`}
            label="Parse guests (full pipeline)"
            checked={parseGuests}
            onChange={(e) => setParseGuests(e.target.checked)}
          />
        )}
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-0.5">Max events (empty = default)</label>
            <Input
              type="number"
              min={1}
              value={maxEvents}
              onChange={(e) => setMaxEvents(e.target.value)}
              placeholder="30"
              className="w-24"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-0.5">Calendar slug</label>
            <Input
              value={calendarSlug}
              onChange={(e) => setCalendarSlug(e.target.value)}
              placeholder="superteam"
              className="w-32"
            />
          </div>
        </div>
        <div>
          <CheckBox
            id={`enabled-${workflowType}`}
            label="Enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
        </div>
        {err && <p className="text-sm text-[var(--color-error)]">{err}</p>}
        <Button type="submit" disabled={saving} size="sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : config ? "Save" : "Create config"}
        </Button>
      </form>
    </div>
  );
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
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferResult, setTransferResult] = useState<{
    created: number;
    skipped: number;
    errors: number;
    timezone_resolved?: number;
    timezone_fallback_offset?: number;
    timezone_missing?: number;
    coords_nullified_zero_zero?: number;
  } | null>(null);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichResult, setEnrichResult] = useState<{ updated: number; failed: number; total_processed: number; errors: string[] } | null>(null);
  const [enrichTimezonesLoading, setEnrichTimezonesLoading] = useState(false);
  const [enrichTimezonesResult, setEnrichTimezonesResult] = useState<{
    processed: number;
    updated_timezone: number;
    left_null: number;
    coords_cleaned: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [saveImagesLoading, setSaveImagesLoading] = useState(false);
  const [saveImagesResult, setSaveImagesResult] = useState<{ saved: number; failed: number; total_processed: number; errors: string[] } | null>(null);
  const [requiredList, setRequiredList] = useState<RequiredVerificationEvent[]>([]);
  const [requiredLoading, setRequiredLoading] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [majorEvents, setMajorEvents] = useState<MajorEventAdminItem[]>([]);
  const [majorLoading, setMajorLoading] = useState(false);
  const [majorUpdatingId, setMajorUpdatingId] = useState<string | null>(null);
  const [workflowConfigs, setWorkflowConfigs] = useState<LumaWorkflowConfig[]>([]);
  const [workflowConfigLoading, setWorkflowConfigLoading] = useState(false);
  const [workflowConfigError, setWorkflowConfigError] = useState<string | null>(null);
  const [fullPipelineLoading, setFullPipelineLoading] = useState(false);
  const [fullPipelineStep, setFullPipelineStep] = useState<string | null>(null);
  const [fullPipelineResult, setFullPipelineResult] = useState<{
    transfer: {
      created: number;
      skipped: number;
      errors: number;
      timezone_resolved?: number;
      timezone_fallback_offset?: number;
      timezone_missing?: number;
      coords_nullified_zero_zero?: number;
    };
    enrich: { updated: number; failed: number; total_processed: number };
    enrichTimezones: {
      processed: number;
      updated_timezone: number;
      left_null: number;
      coords_cleaned: number;
      failed: number;
    };
    saveImages: { saved: number; failed: number; total_processed: number };
  } | null>(null);
  const [fullPipelineError, setFullPipelineError] = useState<string | null>(null);
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

  const fetchRequiredVerification = useCallback(async () => {
    if (!user?.is_admin) return;
    setRequiredLoading(true);
    try {
      const res = await fetch("/api/admin/luma/required-verification");
      const data = await res.json();
      if (res.ok) setRequiredList(data.events ?? []);
    } finally {
      setRequiredLoading(false);
    }
  }, [user?.is_admin]);

  useEffect(() => {
    if (user?.is_admin) fetchRequiredVerification();
  }, [user?.is_admin, fetchRequiredVerification]);

  const fetchMajorEvents = useCallback(async () => {
    if (!user?.is_admin) return;
    setMajorLoading(true);
    try {
      const res = await fetch("/api/admin/events/major");
      const data = await res.json();
      if (res.ok) {
        setMajorEvents(data.events ?? []);
      }
    } finally {
      setMajorLoading(false);
    }
  }, [user?.is_admin]);

  useEffect(() => {
    if (user?.is_admin) fetchMajorEvents();
  }, [user?.is_admin, fetchMajorEvents]);

  const fetchWorkflowConfigs = useCallback(async () => {
    if (!user?.is_admin) return;
    setWorkflowConfigLoading(true);
    setWorkflowConfigError(null);
    try {
      const res = await fetch("/api/admin/luma-config");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load configs");
      setWorkflowConfigs(data.configs ?? []);
    } catch (err) {
      setWorkflowConfigError(err instanceof Error ? err.message : "Failed");
    } finally {
      setWorkflowConfigLoading(false);
    }
  }, [user?.is_admin]);

  useEffect(() => {
    if (user?.is_admin) fetchWorkflowConfigs();
  }, [user?.is_admin, fetchWorkflowConfigs]);

  const handleTransfer = async () => {
    setTransferLoading(true);
    setTransferResult(null);
    try {
      const res = await fetch("/api/admin/luma/transfer", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transfer failed");
      setTransferResult(data);
      fetchRequiredVerification();
      fetchMajorEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setTransferLoading(false);
    }
  };

  const handleSaveImages = async () => {
    setSaveImagesLoading(true);
    setSaveImagesResult(null);
    try {
      const res = await fetch("/api/admin/luma/save-images", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save images failed");
      setSaveImagesResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save images failed");
    } finally {
      setSaveImagesLoading(false);
    }
  };

  const handleEnrichLocations = async () => {
    setEnrichLoading(true);
    setEnrichResult(null);
    try {
      const res = await fetch("/api/admin/luma/enrich-locations", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enrich failed");
      setEnrichResult(data);
      fetchRequiredVerification();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrich failed");
    } finally {
      setEnrichLoading(false);
    }
  };

  const handleEnrichTimezones = async () => {
    setEnrichTimezonesLoading(true);
    setEnrichTimezonesResult(null);
    try {
      const res = await fetch("/api/admin/luma/enrich-timezones", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enrich timezones failed");
      setEnrichTimezonesResult(data);
      fetchRequiredVerification();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Enrich timezones failed"
      );
    } finally {
      setEnrichTimezonesLoading(false);
    }
  };

  const handleRunFullPipeline = async () => {
    setFullPipelineLoading(true);
    setFullPipelineError(null);
    setFullPipelineResult(null);
    try {
      setFullPipelineStep("Transfer");
      const r1 = await fetch("/api/admin/luma/transfer", { method: "POST" });
      const d1 = await r1.json();
      if (!r1.ok) throw new Error(d1.error || "Transfer failed");

      setFullPipelineStep("Enrich locations");
      const r2 = await fetch("/api/admin/luma/enrich-locations", { method: "POST" });
      const d2 = await r2.json();
      if (!r2.ok) throw new Error(d2.error || "Enrich failed");

      setFullPipelineStep("Enrich timezones");
      const r3 = await fetch("/api/admin/luma/enrich-timezones", {
        method: "POST",
      });
      const d3 = await r3.json();
      if (!r3.ok) throw new Error(d3.error || "Enrich timezones failed");

      setFullPipelineStep("Save images");
      const r4 = await fetch("/api/admin/luma/save-images", { method: "POST" });
      const d4 = await r4.json();
      if (!r4.ok) throw new Error(d4.error || "Save images failed");

      setFullPipelineResult({
        transfer: d1,
        enrich: d2,
        enrichTimezones: d3,
        saveImages: d4,
      });
      setFullPipelineStep(null);
      fetchRequiredVerification();
      fetchMajorEvents();
    } catch (err) {
      setFullPipelineError(err instanceof Error ? err.message : "Pipeline failed");
      setFullPipelineStep(null);
    } finally {
      setFullPipelineLoading(false);
    }
  };

  const handleDismissVerification = async (eventId: string) => {
    setDismissingId(eventId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/dismiss-verification`, { method: "POST" });
      if (!res.ok) throw new Error("Dismiss failed");
      setRequiredList((prev) => prev.filter((e) => e.id !== eventId));
    } finally {
      setDismissingId(null);
    }
  };

  const handleToggleMajor = async (eventId: string, nextValue: boolean) => {
    setMajorUpdatingId(eventId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/major`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_major: nextValue }),
      });
      if (!res.ok) throw new Error("Update failed");

      setMajorEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? { ...event, is_major: nextValue } : event
        )
      );
    } finally {
      setMajorUpdatingId(null);
    }
  };

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
              tag: (ownParams.tag ?? "").trim() || undefined,
              parseGuests: ownParams.parseGuests,
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
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Tag (optional, e.g. spain → ?tag=spain)
                    </label>
                    <Input
                      value={ownParams.tag}
                      onChange={(e) => setOwnParams((p) => ({ ...p, tag: e.target.value }))}
                      placeholder="spain"
                    />
                  </div>
                  <div>
                    <CheckBox
                      id="own-parse-guests"
                      label="Parse guests (One-Click RSVP + guest list)"
                      checked={ownParams.parseGuests}
                      onChange={(e) => setOwnParams((p) => ({ ...p, parseGuests: e.target.checked }))}
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

            {/* Workflow config (Schedule) */}
            <div className="mt-8 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Workflow config (Schedule)
              </h2>
              <p className="text-[var(--color-text-secondary)] text-sm mb-4">
                One enabled config per workflow. Cron hits <code className="bg-[var(--color-background)] px-1 rounded">/api/cron/luma-pipeline</code> every hour; runs that are due (daily hour or cron expression) execute the pipeline.
              </p>
              {workflowConfigLoading ? (
                <p className="text-sm text-[var(--color-text-muted)]">Loading configs…</p>
              ) : workflowConfigError ? (
                <p className="text-sm text-[var(--color-error)]">{workflowConfigError}</p>
              ) : (
                <WorkflowConfigBlocks
                  configs={workflowConfigs}
                  onSaved={fetchWorkflowConfigs}
                />
              )}
            </div>

            {/* Run full pipeline (manual trigger) */}
            <div className="mt-8 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Run full pipeline
              </h2>
              <p className="text-[var(--color-text-secondary)] text-sm mb-4">
                Run transfer → enrich locations → enrich timezones → save images in sequence (same as cron). Manual trigger.
              </p>
              <Button
                variant="primary"
                disabled={fullPipelineLoading}
                onClick={handleRunFullPipeline}
              >
                {fullPipelineLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {fullPipelineStep ?? "Running…"}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Run full pipeline
                  </>
                )}
              </Button>
              {fullPipelineError && (
                <p className="mt-3 text-sm text-[var(--color-error)]">{fullPipelineError}</p>
              )}
              {fullPipelineResult && (
                <div className="mt-3 text-sm text-[var(--color-text-primary)] space-y-1">
                  <p>Transfer: created <strong>{fullPipelineResult.transfer.created}</strong>, skipped {fullPipelineResult.transfer.skipped}, errors {fullPipelineResult.transfer.errors}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Transfer timezone stats: resolved {fullPipelineResult.transfer.timezone_resolved ?? 0}, fallback offset {fullPipelineResult.transfer.timezone_fallback_offset ?? 0}, missing {fullPipelineResult.transfer.timezone_missing ?? 0}, zero-zero cleaned {fullPipelineResult.transfer.coords_nullified_zero_zero ?? 0}
                  </p>
                  <p>Enrich: updated <strong>{fullPipelineResult.enrich.updated}</strong>, failed {fullPipelineResult.enrich.failed}, processed {fullPipelineResult.enrich.total_processed}</p>
                  <p>Enrich timezones: updated <strong>{fullPipelineResult.enrichTimezones.updated_timezone}</strong>, left null {fullPipelineResult.enrichTimezones.left_null}, coords cleaned {fullPipelineResult.enrichTimezones.coords_cleaned}, failed {fullPipelineResult.enrichTimezones.failed}, processed {fullPipelineResult.enrichTimezones.processed}</p>
                  <p>Save images: saved <strong>{fullPipelineResult.saveImages.saved}</strong>, failed {fullPipelineResult.saveImages.failed}, processed {fullPipelineResult.saveImages.total_processed}</p>
                </div>
              )}
            </div>

            {/* Transfer Events */}
            <div className="mt-8 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Transfer Events
              </h2>
              <p className="text-[var(--color-text-secondary)] text-sm mb-4">
                Copy Luma events from <code className="bg-[var(--color-background)] px-1 rounded">luma_events</code> into internal <code className="bg-[var(--color-background)] px-1 rounded">events</code>. Already synced events (by luma_event_id or luma_link) are skipped.
              </p>
              <Button
                variant="outline"
                disabled={transferLoading}
                onClick={handleTransfer}
              >
                {transferLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Transferring…
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Transfer Events
                  </>
                )}
              </Button>
              {transferResult && (
                <div className="mt-3 text-sm text-[var(--color-text-primary)] space-y-1">
                  <p>
                    Created: <strong>{transferResult.created}</strong>, skipped: {transferResult.skipped}, errors: {transferResult.errors}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Timezone stats: resolved {transferResult.timezone_resolved ?? 0}, fallback offset {transferResult.timezone_fallback_offset ?? 0}, missing {transferResult.timezone_missing ?? 0}, zero-zero cleaned {transferResult.coords_nullified_zero_zero ?? 0}
                  </p>
                </div>
              )}
            </div>

            {/* Save images (download from Luma CDN → our storage, update event.image_url) */}
            <div className="mt-8 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                <ImagePlus className="w-5 h-5" />
                Save images
              </h2>
              <p className="text-[var(--color-text-secondary)] text-sm mb-4">
                Download event cover images from Luma CDN and upload to our storage (<code className="bg-[var(--color-background)] px-1 rounded">event-images</code>). Updates <code className="bg-[var(--color-background)] px-1 rounded">events.image_url</code> to our URL. Run after transfer. Up to 20 events per run.
              </p>
              <Button
                variant="outline"
                disabled={saveImagesLoading}
                onClick={handleSaveImages}
              >
                {saveImagesLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-4 h-4 mr-2" />
                    Save images
                  </>
                )}
              </Button>
              {saveImagesResult && (
                <p className="mt-3 text-sm text-[var(--color-text-primary)]">
                  Saved: <strong>{saveImagesResult.saved}</strong>, failed: {saveImagesResult.failed}, processed: {saveImagesResult.total_processed}
                  {saveImagesResult.errors?.length > 0 && (
                    <span className="block mt-1 text-[var(--color-text-muted)] text-xs">
                      {saveImagesResult.errors.slice(0, 3).join("; ")}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Enrich locations (country, city, country_code from coordinates) */}
            <div className="mt-8 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Enrich locations
              </h2>
              <p className="text-[var(--color-text-secondary)] text-sm mb-4">
                Run after transfer. Fills <code className="bg-[var(--color-background)] px-1 rounded">country</code>, <code className="bg-[var(--color-background)] px-1 rounded">city</code>, <code className="bg-[var(--color-background)] px-1 rounded">country_code</code> for transferred events using reverse geocoding (Nominatim, ~1 req/sec). Up to 30 events per run.
              </p>
              <Button
                variant="outline"
                disabled={enrichLoading}
                onClick={handleEnrichLocations}
              >
                {enrichLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enriching…
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-2" />
                    Enrich locations
                  </>
                )}
              </Button>
              {enrichResult && (
                <p className="mt-3 text-sm text-[var(--color-text-primary)]">
                  Updated: <strong>{enrichResult.updated}</strong>, failed: {enrichResult.failed}, processed: {enrichResult.total_processed}
                  {enrichResult.errors?.length > 0 && (
                    <span className="block mt-1 text-[var(--color-text-muted)] text-xs">
                      {enrichResult.errors.slice(0, 3).join("; ")}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Enrich timezones (timezone from coordinates, fallback to GMT offset) */}
            <div className="mt-8 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Enrich timezones
              </h2>
              <p className="text-[var(--color-text-secondary)] text-sm mb-4">
                Run after transfer/enrich locations. Fills <code className="bg-[var(--color-background)] px-1 rounded">events.timezone</code> with IANA value using coordinates, falls back to <code className="bg-[var(--color-background)] px-1 rounded">Etc/GMT±N</code> parsed from Luma raw datetime text, and cleans placeholder coordinates <code className="bg-[var(--color-background)] px-1 rounded">(0,0)</code>.
              </p>
              <Button
                variant="outline"
                disabled={enrichTimezonesLoading}
                onClick={handleEnrichTimezones}
              >
                {enrichTimezonesLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enriching timezones…
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Enrich timezones
                  </>
                )}
              </Button>
              {enrichTimezonesResult && (
                <p className="mt-3 text-sm text-[var(--color-text-primary)]">
                  Updated timezone: <strong>{enrichTimezonesResult.updated_timezone}</strong>, left null: {enrichTimezonesResult.left_null}, coords cleaned: {enrichTimezonesResult.coords_cleaned}, failed: {enrichTimezonesResult.failed}, processed: {enrichTimezonesResult.processed}
                  {enrichTimezonesResult.errors?.length > 0 && (
                    <span className="block mt-1 text-[var(--color-text-muted)] text-xs">
                      {enrichTimezonesResult.errors.slice(0, 3).join("; ")}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Major events */}
            <div className="mt-8 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                <Star className="w-5 h-5" />
                Major events
              </h2>
              <p className="text-[var(--color-text-secondary)] text-sm mb-4">
                Mark events manually as major. The events page will show up to 3 major events first, and all non-major upcoming events in Local events.
              </p>
              {majorLoading ? (
                <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
              ) : majorEvents.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">No upcoming events found.</p>
              ) : (
                <ul className="space-y-3">
                  {majorEvents.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex flex-col gap-3 border-b border-[var(--color-surface-border)] pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-[var(--color-text-primary)] truncate block">
                          {ev.name || "(no name)"}
                        </span>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {ev.city || "Unknown city"}
                          {ev.country ? `, ${ev.country}` : ""}
                          {ev.start_date
                            ? ` · ${new Date(ev.start_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}`
                            : ""}
                          {` · ${ev.visibility === "vip_only" ? "VIP" : "Public"}`}
                        </p>
                        {ev.slug ? (
                          <Link
                            href={`/events/${ev.slug}`}
                            className="text-xs text-[var(--color-primary)] hover:underline"
                          >
                            /events/{ev.slug}
                          </Link>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">{ev.id}</span>
                        )}
                      </div>

                      <Button
                        variant={ev.is_major ? "primary" : "outline"}
                        size="sm"
                        disabled={majorUpdatingId === ev.id}
                        onClick={() => handleToggleMajor(ev.id, !ev.is_major)}
                        title={ev.is_major ? "Remove from major events" : "Add to major events"}
                      >
                        {majorUpdatingId === ev.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : ev.is_major ? (
                          "Major"
                        ) : (
                          "Set major"
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Required verification */}
            <div className="mt-8 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Required verification
              </h2>
              <p className="text-[var(--color-text-secondary)] text-sm mb-4">
                Events already in our table but missing name, date, description, image, country, city, address, or hosts. Dismiss when no longer needed.
              </p>
              {requiredLoading ? (
                <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
              ) : requiredList.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">No events require verification.</p>
              ) : (
                <ul className="space-y-3">
                  {requiredList.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center justify-between gap-4 py-2 border-b border-[var(--color-surface-border)] last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-[var(--color-text-primary)] truncate block">
                          {ev.name || "(no name)"}
                        </span>
                        {ev.slug ? (
                          <Link
                            href={`/events/${ev.slug}`}
                            className="text-xs text-[var(--color-primary)] hover:underline"
                          >
                            /events/{ev.slug}
                          </Link>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">{ev.id}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={dismissingId === ev.id}
                        onClick={() => handleDismissVerification(ev.id)}
                        title="Exclude from this list (no longer require verification)"
                      >
                        {dismissingId === ev.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Dismiss
                          </>
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

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
