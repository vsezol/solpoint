"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AuthRequiredModal, Button, Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui";
import { formControlFocusClasses } from "@/components/ui/form-control-focus";
import { Loader2, MapPin, Plus, Trash2, Users } from "lucide-react";
import type { User } from "@/types";
import type { FriendshipStatus } from "@/types/profile";
import {
  getProfileData,
  getProfileDetails,
  getProfileMutualConnections,
  getProfileMutualEvents,
  saveProfileDetails,
  type MutualConnection,
  type MutualEvent,
  type ProfileDetailsResponse,
} from "@/lib/api/profile";
import { addFriend, removeFriend } from "@/lib/api/friends";
import { cn } from "@/lib/utils";

/** Figma: Kode Mono 15px / Medium / line-height 100% */
const kodeMono15: CSSProperties = {
  fontFamily: "var(--font-kode-mono), monospace",
  fontWeight: 500,
  fontSize: 15,
  lineHeight: 1,
  letterSpacing: 0,
};

/** Figma: Inter 20px / Extra Bold / line-height 100% */
const interDisplayName: CSSProperties = {
  fontFamily: "var(--font-inter), sans-serif",
  fontWeight: 800,
  fontSize: 20,
  lineHeight: 1,
  letterSpacing: 0,
};

/** Figma: Inter 12px / Medium / line-height 100% */
const interBody12: CSSProperties = {
  fontFamily: "var(--font-inter), sans-serif",
  fontWeight: 500,
  fontSize: 12,
  lineHeight: 1,
  letterSpacing: 0,
};

/** Figma: Connect — Kode Mono 25px Bold, 195×44, radius 5px */
const kodeMono25Bold: CSSProperties = {
  fontFamily: "var(--font-kode-mono), monospace",
  fontWeight: 700,
  fontSize: 25,
  lineHeight: 1,
  letterSpacing: 0,
};

const figmaConnectButtonClass =
  "flex h-[44px] w-[195px] shrink-0 items-center justify-center rounded-[5px] border-0 bg-white p-0 text-black shadow-none hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]";

interface ProfileV2ContentProps {
  user: User;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
  initialFriendshipStatus: FriendshipStatus;
}

type ExpFormRow = {
  key: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
};

function emptyExpRow(): ExpFormRow {
  return {
    key: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `exp-${Date.now()}`,
    title: "",
    company: "",
    startDate: "",
    endDate: "",
    description: "",
  };
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-03" → "Mar 2025". Legcy free-text returned as-is. */
function fmtMonthYear(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const idx = parseInt(m[2], 10) - 1;
    return `${MONTH_NAMES[idx] ?? m[2]} ${m[1]}`;
  }
  return value;
}

function detailsToExpDrafts(d: ProfileDetailsResponse): ExpFormRow[] {
  if (d.experience.length === 0) {
    return [emptyExpRow()];
  }
  return d.experience.map((e) => ({
    key: e.id,
    title: e.title,
    company: e.company ?? "",
    startDate: e.startDate ?? "",
    endDate: e.endDate ?? "",
    description: e.description ?? "",
  }));
}

const textareaClass = cn(
  "w-full min-h-[100px] rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
  formControlFocusClasses
);

const inputClass = cn(
  "w-full rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
  formControlFocusClasses
);

/** Figma: fill #121212, radius 6px */
const profileSectionCardClass = "rounded-[6px] border border-white/10 bg-[#121212]";

function ProfileSectionContentLoader() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center justify-center py-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-6 w-6 shrink-0 animate-spin text-white/40" aria-hidden />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function ProfileV2Content({
  user,
  isOwnProfile,
  isAuthenticated,
  initialFriendshipStatus,
}: ProfileV2ContentProps) {
  const queryClient = useQueryClient();
  const [friendsCount, setFriendsCount] = useState(0);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>(initialFriendshipStatus);
  const [isConnectLoading, setIsConnectLoading] = useState(false);

  const [details, setDetails] = useState<ProfileDetailsResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [aboutDraft, setAboutDraft] = useState("");
  const [skillsDraft, setSkillsDraft] = useState("");
  const [expDrafts, setExpDrafts] = useState<ExpFormRow[]>([emptyExpRow()]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  /** Own profile: view (lists) vs edit (inputs). Guests always see view. */
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [mutualConnections, setMutualConnections] = useState<MutualConnection[]>([]);
  const [mutualConnectionsItems, setMutualConnectionsItems] = useState<MutualConnection[]>([]);
  const [mutualConnectionsCount, setMutualConnectionsCount] = useState(0);
  const [mutualEvents, setMutualEvents] = useState<MutualEvent[]>([]);
  const [mutualEventsItems, setMutualEventsItems] = useState<MutualEvent[]>([]);
  const [mutualEventsCount, setMutualEventsCount] = useState(0);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false);
  const [isEventsModalOpen, setIsEventsModalOpen] = useState(false);

  const applyDetails = useCallback(
    (d: ProfileDetailsResponse) => {
      setDetails(d);
      if (isOwnProfile) {
        setAboutDraft(d.about ?? "");
        setSkillsDraft(d.skills.map((s) => s.name).join("\n"));
        setExpDrafts(detailsToExpDrafts(d));
      }
    },
    [isOwnProfile]
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setDetailsLoading(true);
      setDetailsError(null);
      try {
        const profileData = await getProfileData(user.id);
        if (!cancelled) {
          setFriendsCount(profileData.friendsCount || 0);
          setFriendshipStatus(profileData.friendshipStatus || initialFriendshipStatus);
        }
      } catch (error) {
        console.error("Failed to load profile data:", error);
      }

      try {
        const d = await getProfileDetails(user.id);
        if (!cancelled) {
          applyDetails(d);
        }
      } catch (error) {
        console.error("Failed to load profile details:", error);
        if (!cancelled) {
          setDetailsError("Could not load profile details.");
          setDetails({
            about: user.bio ?? null,
            skills: [],
            experience: [],
          });
          if (isOwnProfile) {
            setAboutDraft(user.bio ?? "");
            setSkillsDraft("");
            setExpDrafts([emptyExpRow()]);
          }
        }
      } finally {
        if (!cancelled) {
          setDetailsLoading(false);
        }
      }

      if (!isAuthenticated || isOwnProfile) {
        return;
      }

      try {
        const [connectionsData, eventsData] = await Promise.all([
          getProfileMutualConnections(user.id),
          getProfileMutualEvents(user.id),
        ]);

        if (!cancelled) {
          setMutualConnections(connectionsData.preview || []);
          setMutualConnectionsItems(connectionsData.items || []);
          setMutualConnectionsCount(connectionsData.count || 0);
          setMutualEvents(eventsData.preview || []);
          setMutualEventsItems(eventsData.items || []);
          setMutualEventsCount(eventsData.count || 0);
        }
      } catch (error) {
        console.error("Failed to load mutual context:", error);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [applyDetails, initialFriendshipStatus, isAuthenticated, isOwnProfile, user.bio, user.id]);

  const location = useMemo(() => {
    const countryName = (user as User & { countries?: { name?: string } }).countries?.name || user.country;
    if (user.city && countryName) return `${user.city}, ${countryName}`;
    if (user.city) return user.city;
    if (countryName) return countryName;
    return "Location not specified";
  }, [user]);

  const aboutDisplay = details?.about ?? user.about ?? user.bio ?? null;
  const skillsList = details?.skills ?? [];
  const experienceList = details?.experience ?? [];
  const showProfileForm = isOwnProfile && isEditingProfile;

  const handleConnectClick = async () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    if (isOwnProfile || isConnectLoading) {
      return;
    }

    setIsConnectLoading(true);
    try {
      if (friendshipStatus === "none" || friendshipStatus === "pending_received") {
        const result = await addFriend(user.id);
        setFriendshipStatus(result.status);
      } else {
        await removeFriend(user.id);
        setFriendshipStatus("none");
      }
    } catch (error) {
      console.error("Failed to update connection:", error);
      alert(error instanceof Error ? error.message : "Failed to update connection");
    } finally {
      setIsConnectLoading(false);
    }
  };

  const handleOpenConnectionsList = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsConnectionsModalOpen(true);
  };

  const handleOpenEventsList = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsEventsModalOpen(true);
  };

  const handleSave = async () => {
    if (!isAuthenticated || !isOwnProfile || isSaving) {
      if (!isAuthenticated) {
        setIsAuthModalOpen(true);
      }
      return;
    }

    setSaveMessage(null);
    setIsSaving(true);
    try {
      const skillNames = skillsDraft
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((name) => ({ name }));

      const experiencePayload = expDrafts
        .filter((row) => row.title.trim())
        .map((row) => ({
          title: row.title.trim(),
          company: row.company.trim() || null,
          startDate: row.startDate.trim() || null,
          endDate: row.endDate.trim() || null,
          description: row.description.trim() || null,
        }));

      const saved = await saveProfileDetails({
        about: aboutDraft.trim() || null,
        skills: skillNames,
        experience: experiencePayload,
      });
      applyDetails(saved);
      await queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
      setIsEditingProfile(false);
      setSaveMessage(null);
    } catch (error) {
      console.error("Failed to save profile:", error);
      alert(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (details) {
      applyDetails(details);
    } else {
      setAboutDraft(user.bio ?? "");
      setSkillsDraft("");
      setExpDrafts([emptyExpRow()]);
    }
    setIsEditingProfile(false);
    setSaveMessage(null);
  };

  const addExperienceRow = () => {
    setExpDrafts((prev) => [...prev, emptyExpRow()]);
  };

  const removeExperienceRow = (key: string) => {
    setExpDrafts((prev) => {
      const next = prev.filter((r) => r.key !== key);
      return next.length === 0 ? [emptyExpRow()] : next;
    });
  };

  const connectButtonLabel =
    friendshipStatus === "accepted"
      ? "Connected"
      : friendshipStatus === "pending_sent"
        ? "Pending"
        : friendshipStatus === "pending_received"
          ? "Accept"
          : "Connect";

  const identityBlock = (
    <div className="min-w-0 max-w-full">
      <h1 className="mb-[16px] text-[var(--color-text-primary)]" style={interDisplayName}>
        {user.twitter_name}
      </h1>
      <p className="mb-[13px] text-[var(--color-text-muted)]" style={kodeMono15}>
        @{user.twitter_handle}
      </p>

      {user.role && (
        <p className="mb-[13px] flex items-center gap-2 text-[var(--color-text-secondary)] capitalize" style={kodeMono15}>
          <Users className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          <span>{user.role}</span>
        </p>
      )}

      <p className="mb-[22px] flex items-center gap-2 text-[var(--color-text-secondary)]" style={kodeMono15}>
        <MapPin className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        <span>{location}</span>
      </p>

      <p className="text-[var(--color-text-secondary)]" style={kodeMono15}>
        {friendsCount} connections
      </p>
    </div>
  );

  const aboutCard = (
    <div className={cn(profileSectionCardClass, "flex w-full min-w-0 flex-col p-3")}>
      <h3 className="mb-2 text-[var(--color-text-primary)]" style={kodeMono15}>
        About
      </h3>
      {detailsError && (
        <p className="mb-2 text-xs text-amber-500" style={interBody12}>
          {detailsError}
        </p>
      )}
      {showProfileForm ? (
        <textarea
          className={cn(textareaClass, "min-h-[100px] text-[12px] font-medium leading-none")}
          style={interBody12}
          value={aboutDraft}
          onChange={(e) => setAboutDraft(e.target.value)}
          placeholder="Tell others about yourself..."
          maxLength={4000}
          rows={5}
          disabled={detailsLoading}
        />
      ) : detailsLoading ? (
        <ProfileSectionContentLoader />
      ) : (
        <p className="whitespace-pre-wrap text-[var(--color-text-secondary)]" style={interBody12}>
          {aboutDisplay || "No information yet."}
        </p>
      )}
    </div>
  );

  const experienceCard = (
    <div className={cn(profileSectionCardClass, "flex w-full min-w-0 flex-col p-4")}>
      <h3 className="mb-5 text-[var(--color-text-primary)]" style={kodeMono15}>
        Experience
      </h3>
      {showProfileForm ? (
        <div className="space-y-4">
          {expDrafts.map((row) => (
            <div key={row.key} className="space-y-2 rounded-[6px] border border-white/10 p-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeExperienceRow(row.key)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  aria-label="Remove experience"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input
                className={inputClass}
                placeholder="Title (e.g. Founder)"
                value={row.title}
                onChange={(e) =>
                  setExpDrafts((prev) => prev.map((r) => (r.key === row.key ? { ...r, title: e.target.value } : r)))
                }
              />
              <input
                className={inputClass}
                placeholder="Company / project"
                value={row.company}
                onChange={(e) =>
                  setExpDrafts((prev) => prev.map((r) => (r.key === row.key ? { ...r, company: e.target.value } : r)))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Start</label>
                  <input
                    type="month"
                    className={inputClass}
                    value={row.startDate}
                    onChange={(e) =>
                      setExpDrafts((prev) =>
                        prev.map((r) => (r.key === row.key ? { ...r, startDate: e.target.value } : r))
                      )
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">End (leave blank = present)</label>
                  <input
                    type="month"
                    className={inputClass}
                    value={row.endDate}
                    onChange={(e) =>
                      setExpDrafts((prev) =>
                        prev.map((r) => (r.key === row.key ? { ...r, endDate: e.target.value } : r))
                      )
                    }
                  />
                </div>
              </div>
              <textarea
                className={textareaClass + " min-h-[72px]"}
                placeholder="Description (optional)"
                rows={2}
                value={row.description}
                onChange={(e) =>
                  setExpDrafts((prev) =>
                    prev.map((r) => (r.key === row.key ? { ...r, description: e.target.value } : r))
                  )
                }
              />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addExperienceRow}>
            <Plus className="w-4 h-4 mr-2" />
            Add experience
          </Button>
        </div>
      ) : detailsLoading ? (
        <ProfileSectionContentLoader />
      ) : experienceList.length === 0 ? (
        <p className="text-[var(--color-text-secondary)]" style={interBody12}>
          No experience added yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3 text-[var(--color-text-secondary)]">
          {experienceList.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-0 last:pb-0" style={interBody12}>
              <p className="min-w-0 break-words leading-snug">
                {e.title}{e.company ? ` at ${e.company}` : ""}
              </p>
              {(e.startDate || e.endDate) && (
                <p className="shrink-0 whitespace-nowrap text-[var(--color-text-muted)] leading-snug">
                  {fmtMonthYear(e.startDate) || "—"} — {fmtMonthYear(e.endDate) || "Present"}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const skillsCard = (
    <div className={cn(profileSectionCardClass, "flex w-full min-w-0 flex-col p-4")}>
      <h3 className="mb-3 text-[var(--color-text-primary)]" style={kodeMono15}>
        Skills
      </h3>
      {showProfileForm ? (
        <div>
          <p className="mb-2 text-[var(--color-text-muted)]" style={interBody12}>
            One skill per line
          </p>
          <textarea
            className={cn(textareaClass, "min-h-[140px] text-[12px] font-medium leading-none")}
            style={interBody12}
            value={skillsDraft}
            onChange={(e) => setSkillsDraft(e.target.value)}
            placeholder={"Business development\nHiring"}
            disabled={detailsLoading}
          />
        </div>
      ) : detailsLoading ? (
        <ProfileSectionContentLoader />
      ) : skillsList.length === 0 ? (
        <p className="text-[var(--color-text-secondary)]" style={interBody12}>
          No skills added yet.
        </p>
      ) : (
        <ul className="list-inside list-disc space-y-1 text-[var(--color-text-secondary)]" style={interBody12}>
          {skillsList.map((s) => (
            <li key={s.id}>{s.name}</li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,6fr)_minmax(0,4fr)] gap-6 items-start">
      <section className="overflow-hidden rounded-none border border-white/10 bg-black">
        <div className="relative h-32 sm:h-40 bg-[var(--color-surface)]">
          {user.banner_url && <Image src={user.banner_url} alt="Profile banner" fill className="object-cover" unoptimized />}
        </div>

        <div className="px-4 pb-4 pt-[23px] sm:px-6 sm:pb-6">
          <div className="-mt-16 mb-4">
            <Avatar
              src={user.avatar_url}
              alt={user.twitter_name}
              size="xl"
              isVip={user.subscription_tier === "vip"}
              isVerified={user.is_verified}
            />
          </div>

          {/* Mobile: name → About → Experience → Skills */}
          <div className="flex flex-col gap-4 md:hidden">
            {identityBlock}
            {aboutCard}
            {experienceCard}
            {skillsCard}
          </div>

          {/* Desktop: 2 columns — left: identity+experience, right: about+skills */}
          <div className="hidden md:grid md:grid-cols-2 md:gap-6 md:items-start">
            <div className="min-w-0 flex flex-col gap-4">
              {identityBlock}
              {experienceCard}
            </div>
            <div className="min-w-0 flex flex-col gap-4">
              {aboutCard}
              {skillsCard}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
            {!isOwnProfile && (
              <Button
                type="button"
                variant="primary"
                className={figmaConnectButtonClass}
                style={kodeMono25Bold}
                onClick={handleConnectClick}
                disabled={isConnectLoading}
              >
                {isConnectLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" aria-hidden />
                ) : null}
                {connectButtonLabel}
              </Button>
            )}
            {isOwnProfile && !isEditingProfile && (
              <Button
                type="button"
                variant="outline"
                className="border-white/35 text-[var(--color-text-primary)] hover:bg-white/10"
                onClick={() => {
                  setIsEditingProfile(true);
                  setSaveMessage(null);
                }}
                disabled={detailsLoading}
              >
                Edit profile
              </Button>
            )}
            {isOwnProfile && isEditingProfile && (
              <>
                <Button type="button" variant="primary" onClick={handleSave} disabled={isSaving || detailsLoading}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                  Cancel
                </Button>
              </>
            )}
            {saveMessage && isEditingProfile && (
              <span className="text-sm text-green-500" style={interBody12}>
                {saveMessage}
              </span>
            )}
          </div>
        </div>
      </section>

      <aside className="rounded-xl bg-black px-5 py-6 sm:px-8 sm:py-8" style={{ border: "1px solid rgba(255,255,255,0.10)" }}>
        <h3 className="mb-6 text-center text-base font-semibold text-white">Mutual context</h3>
        {isOwnProfile ? (
          <p className="text-center text-sm text-[var(--color-text-secondary)]">Mutual context is shown when someone else views your profile.</p>
        ) : !isAuthenticated ? (
          <p className="text-center text-sm text-[var(--color-text-secondary)]">Sign in to see mutual connections and shared events.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Mutual connections */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Mutual connections: <span className="font-bold text-white">{mutualConnectionsCount}</span>
              </p>
              <div className="flex min-h-[48px] items-center">
                {mutualConnections.slice(0, 3).map((item, i) => (
                  <Link
                    href={`/profile-v2/${item.twitter_handle}`}
                    key={item.id}
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-black bg-[var(--color-surface)] transition-transform hover:z-10 hover:scale-105"
                    style={{ marginLeft: i === 0 ? 0 : "-14px", zIndex: i }}
                  >
                    {item.avatar_url ? (
                      <Image src={item.avatar_url} alt={item.twitter_name} width={48} height={48} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-white">
                        {item.twitter_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
              <button
                onClick={handleOpenConnectionsList}
                className="w-full rounded-[5px] bg-white py-3 text-sm font-bold text-black transition-opacity hover:opacity-90"
              >
                Show list
              </button>
            </div>

            {/* Same event attendee */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Same event attendee: <span className="font-bold text-white">{mutualEventsCount}</span>
              </p>
              <div className="flex min-h-[48px] items-center">
                {mutualEvents.slice(0, 3).map((event, i) => (
                  <Link
                    href={`/events/${event.slug || event.id}`}
                    key={event.id}
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-black bg-[var(--color-surface)] transition-transform hover:z-10 hover:scale-105"
                    style={{ marginLeft: i === 0 ? 0 : "-14px", zIndex: i }}
                  >
                    {event.image_url ? (
                      <Image src={event.image_url} alt={event.name} width={48} height={48} className="h-full w-full object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] text-white">
                        Event
                      </div>
                    )}
                  </Link>
                ))}
              </div>
              <button
                onClick={handleOpenEventsList}
                className="w-full rounded-[5px] bg-white py-3 text-sm font-bold text-black transition-opacity hover:opacity-90"
              >
                Show list
              </button>
            </div>
          </div>
        )}
      </aside>

      <Modal isOpen={isConnectionsModalOpen} onClose={() => setIsConnectionsModalOpen(false)} size="md" ariaLabel="Mutual connections">
        <ModalHeader>
          <ModalTitle>Mutual connections</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {mutualConnectionsCount === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">No mutual connections.</p>
            ) : (
              <ul className="space-y-2">
                {mutualConnectionsItems.map((item) => (
                  <li key={item.id}>
                    <Link href={`/profile-v2/${item.twitter_handle}`} className="text-[var(--color-primary)] hover:underline">
                      {item.twitter_name} @{item.twitter_handle}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ModalContent>
      </Modal>

      <Modal isOpen={isEventsModalOpen} onClose={() => setIsEventsModalOpen(false)} size="md" ariaLabel="Mutual events">
        <ModalHeader>
          <ModalTitle>Same event attendee</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {mutualEventsCount === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">No shared upcoming events.</p>
            ) : (
              <ul className="space-y-2">
                {mutualEventsItems.map((event) => (
                  <li key={event.id}>
                    <Link href={`/events/${event.slug || event.id}`} className="text-[var(--color-primary)] hover:underline">
                      {event.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ModalContent>
      </Modal>

      <AuthRequiredModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Sign in required"
        description="Please sign up or log in to continue."
      />
    </div>
  );
}
