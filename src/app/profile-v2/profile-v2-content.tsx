"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { AuthRequiredModal, Button, Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui";
import { SkillTagPicker } from "@/components/ui/skill-tag-picker";
import { formControlFocusClasses } from "@/components/ui/form-control-focus";
import { Bookmark, Calendar, ChevronDown, Loader2, MapPin, Plus, Search, Trash2, UserRound } from "lucide-react";
import type { User } from "@/types";
import type { FriendshipStatus } from "@/types/profile";
import {
  getProfileData,
  getProfileDetails,
  getProfileMutualConnections,
  getProfileMutualEvents,
  getProfileConnections,
  saveProfileDetails,
  type MutualConnection,
  type MutualEvent,
  type ProfileDetailsResponse,
} from "@/lib/api/profile";
import { getInterests } from "@/lib/api/interests";
import { getSkills } from "@/lib/api/skills";
import {
  INTEREST_DEFINITIONS,
  MAX_PROFILE_SKILLS,
  SKILL_CATEGORIES,
  SKILL_DEFINITIONS,
  USER_ROLE_LABELS,
  USER_ROLE_OPTIONS,
} from "@/lib/profile-taxonomy";
import { addFriend, removeFriend } from "@/lib/api/friends";
import { cn } from "@/lib/utils";
import type { Interest, UserRole } from "@/types";
import { normalizeTwitterAvatarUrl } from "@/lib/twitter-avatar";
import countries from "../../../supabase/coutries";

/** Figma: Kode Mono 15px / Medium / line-height 100% */
const kodeMono15: CSSProperties = {
  fontFamily: "var(--font-kode-mono), monospace",
  fontWeight: 500,
  fontSize: 15,
  lineHeight: 1,
  letterSpacing: 0,
};

/** Figma: Space Grotesk 20px / Bold / line-height 130% */
const profileNameStyle: CSSProperties = {
  fontFamily: "var(--font-display), sans-serif",
  fontWeight: 700,
  fontSize: 20,
  lineHeight: "26px",
  letterSpacing: 0,
};

/** Figma: Space Grotesk 20px / Medium / line-height 150% */
const sectionBodyStyle: CSSProperties = {
  fontFamily: "var(--font-display), sans-serif",
  fontWeight: 500,
  fontSize: 20,
  lineHeight: "30px",
  letterSpacing: 0,
};

/** Figma: Space Grotesk 17px / Medium / line-height 100% */
const skillLabelStyle: CSSProperties = {
  fontFamily: "var(--font-display), sans-serif",
  fontWeight: 500,
  fontSize: 17,
  lineHeight: "17px",
  letterSpacing: "-0.275px",
};

/** Figma: Space Grotesk 15px / Bold / uppercase headings */
const sectionHeadingStyle: CSSProperties = {
  fontFamily: "var(--font-display), sans-serif",
  fontWeight: 700,
  fontSize: 15,
  lineHeight: "12px",
  letterSpacing: "2px",
};

/** Figma: Inter 12px / Medium / line-height 100% */
const interBody12: CSSProperties = {
  fontFamily: "var(--font-inter), sans-serif",
  fontWeight: 500,
  fontSize: 12,
  lineHeight: 1,
  letterSpacing: 0,
};

const figmaConnectButtonClass =
  "flex h-[40px] w-[132px] shrink-0 items-center justify-center rounded-[5px] border-0 bg-white p-0 text-[18px] leading-none text-black shadow-none hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:h-[44px] sm:w-[173px] sm:text-[25px]";

// Compact sizes: match the default `Button` sizing (same as "Edit profile")
// Keep Connect-like colors + focus behavior, but without fixed h/w.
const figmaConnectButtonCompactClass =
  "rounded-[5px] border-0 bg-white text-black shadow-none hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]";
const figmaCancelButtonCompactClass =
  "rounded-[5px] border border-white/35 bg-transparent text-[var(--color-text-primary)] shadow-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]";

/** Shared overrides for profile-v2 modals — matches events/map-filter aesthetic */
const v2ModalClass = "!bg-[#101319] !border-white/[0.08] !rounded-[10px]";
const v2ModalHeaderClass = "!border-white/[0.08]";
const v2ModalTitleStyle: CSSProperties = {
  fontFamily: "var(--font-kode-mono), monospace",
  fontWeight: 600,
  fontSize: 15,
  lineHeight: 1,
  letterSpacing: 0,
};
const v2CloseButtonClass =
  "!text-white/40 hover:!text-white hover:!bg-white/10 !rounded-[5px]";

function formatEventDate(startDate: string, endDate?: string | null): string {
  const start = new Date(startDate);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const s = start.toLocaleDateString("en-US", opts);
  if (!endDate) return s;
  const end = new Date(endDate);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${s} – ${end.getDate()}`;
  }
  return `${s} – ${end.toLocaleDateString("en-US", opts)}`;
}

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
  "profile-v2-field w-full min-h-[100px] rounded-[4px] border border-[#5e5e5e] bg-black px-2.5 py-2 text-[14px] font-semibold text-white placeholder:text-[#a4a7ac]",
  formControlFocusClasses
);

const inputClass = cn(
  "profile-v2-field w-full rounded-[4px] border border-[#5e5e5e] bg-black px-2.5 py-2 text-[14px] font-semibold text-white placeholder:text-[#a4a7ac]",
  formControlFocusClasses
);

const profileFilterTriggerClass =
  "flex h-10 w-full items-center justify-between border border-[#5e5e5e] bg-black px-2.5 text-left text-[14px] font-semibold text-white";

type PopupSelectOption = {
  value: string;
  label: string;
  icon?: string;
};

type SearchableSingleSelectProps = {
  label: string;
  placeholder: string;
  value: string;
  options: PopupSelectOption[];
  onChange: (nextValue: string) => void;
  searchPlaceholder?: string;
};

function countryCodeToFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return code
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function SearchableSingleSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
  searchPlaceholder,
}: SearchableSingleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [isOpen]);

  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  return (
    <div ref={rootRef} className="relative">
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs text-[var(--color-text-muted)]">{label}</label>
        <button
          type="button"
          className={cn(
            "text-[11px] transition-colors",
            value ? "text-white/70 hover:text-white" : "cursor-default text-white/35"
          )}
          onClick={() => {
            if (!value) return;
            onChange("");
            setQuery("");
          }}
          disabled={!value}
        >
          clear
        </button>
      </div>

      <button
        type="button"
        className={profileFilterTriggerClass}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={cn("flex min-w-0 items-center gap-2 truncate", !selected && "text-white/55")}>
          {selected?.icon ? <span aria-hidden>{selected.icon}</span> : null}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-white/70 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 border border-[#2A2A2A] bg-[#0E0F11] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          <div className="mb-2 flex h-9 items-center gap-2 border border-[#2A2A2A] bg-black px-2">
            <Search className="h-3.5 w-3.5 text-white/55" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder ?? `find ${label.toLowerCase()}`}
              className="w-full bg-transparent text-[12px] text-white placeholder:text-white/45 focus:outline-none"
            />
          </div>

          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            <button
              type="button"
              className="flex w-full items-center justify-between px-2 py-1.5 text-left text-[12px] font-semibold text-white hover:bg-white/5"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
            >
              <span>All</span>
              <span className={cn("h-3.5 w-3.5 border", !value ? "border-white bg-white" : "border-white/30")} />
            </button>

            {filteredOptions.map((option) => {
              const checked = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-[12px] text-white hover:bg-white/5"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    {option.icon ? <span aria-hidden>{option.icon}</span> : null}
                    <span className="truncate">{option.label}</span>
                  </span>
                  <span className={cn("h-3.5 w-3.5 border", checked ? "border-white bg-white" : "border-white/30")} />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

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
  const [skillSlugsDraft, setSkillSlugsDraft] = useState<string[]>([]);
  const [expDrafts, setExpDrafts] = useState<ExpFormRow[]>([emptyExpRow()]);
  const [roleDraft, setRoleDraft] = useState<UserRole | "">("");
  const [countryCodeDraft, setCountryCodeDraft] = useState("");
  const [interestSlugsDraft, setInterestSlugsDraft] = useState<string[]>([]);
  const [interestDictionary, setInterestDictionary] = useState<Interest[]>([]);
  const [skillDictionary, setSkillDictionary] = useState(SKILL_DEFINITIONS);
  const [skillCategories, setSkillCategories] = useState(SKILL_CATEGORIES);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  /** Own profile: view (lists) vs edit (inputs). Guests always see view. */
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const MAX_INTERESTS = 3;

  const [mutualConnections, setMutualConnections] = useState<MutualConnection[]>([]);
  const [mutualConnectionsItems, setMutualConnectionsItems] = useState<MutualConnection[]>([]);
  const [mutualConnectionsCount, setMutualConnectionsCount] = useState(0);
  const [mutualEvents, setMutualEvents] = useState<MutualEvent[]>([]);
  const [mutualEventsItems, setMutualEventsItems] = useState<MutualEvent[]>([]);
  const [mutualEventsCount, setMutualEventsCount] = useState(0);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false);
  const [isEventsModalOpen, setIsEventsModalOpen] = useState(false);

  const [isAllConnectionsModalOpen, setIsAllConnectionsModalOpen] = useState(false);
  const [allConnections, setAllConnections] = useState<MutualConnection[]>([]);
  const [allConnectionsLoading, setAllConnectionsLoading] = useState(false);

  const applyDetails = useCallback(
    (d: ProfileDetailsResponse) => {
      setDetails(d);
      if (isOwnProfile) {
        setAboutDraft(d.about ?? "");
        setSkillSlugsDraft(d.skills.map((s) => s.slug).slice(0, MAX_PROFILE_SKILLS));
        setExpDrafts(detailsToExpDrafts(d));
        setRoleDraft((d.role as UserRole | null) ?? "");
        setCountryCodeDraft(d.countryCode ?? "");
        setInterestSlugsDraft((d.interestSlugs ?? []).slice(0, MAX_INTERESTS));
      }
    },
    [MAX_INTERESTS, isOwnProfile]
  );

  useEffect(() => {
    let cancelled = false;

    const loadInterestDictionary = async () => {
      try {
        const list = await getInterests();
        if (!cancelled) {
          setInterestDictionary(list);
        }
      } catch (error) {
        console.error("Failed to load interests:", error);
      }
    };

    const loadSkillDictionary = async () => {
      try {
        const dictionary = await getSkills();
        if (!cancelled) {
          if (dictionary.items.length > 0) {
            setSkillDictionary(dictionary.items);
          }
          if (dictionary.categories.length > 0) {
            setSkillCategories(dictionary.categories);
          }
        }
      } catch (error) {
        console.error("Failed to load skills:", error);
      }
    };

    loadInterestDictionary();
    loadSkillDictionary();

    return () => {
      cancelled = true;
    };
  }, []);

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
            role: user.role ?? null,
            country: user.country ?? null,
            countryCode: user.country_code ?? null,
            city: user.city ?? null,
            interests: [],
            interestSlugs: [],
          });
          if (isOwnProfile) {
            setAboutDraft(user.bio ?? "");
            setSkillSlugsDraft([]);
            setExpDrafts([emptyExpRow()]);
            setRoleDraft((user.role as UserRole | null) ?? "");
            setCountryCodeDraft(user.country_code ?? "");
            setInterestSlugsDraft([]);
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
  }, [
    applyDetails,
    initialFriendshipStatus,
    isAuthenticated,
    isOwnProfile,
    user.bio,
    user.city,
    user.country,
    user.country_code,
    user.id,
    user.role,
  ]);

  const showProfileForm = isOwnProfile && isEditingProfile;

  const countryNameByCode = useMemo(
    () => new Map(countries.map((country) => [country.code, country.name])),
    []
  );

  const displayCountryName = showProfileForm
    ? countryNameByCode.get(countryCodeDraft) || details?.country || user.country || null
    : details?.country || (user as User & { countries?: { name?: string } }).countries?.name || user.country || null;

  const location = useMemo(() => {
    if (user.city && displayCountryName) return `${user.city}, ${displayCountryName}`;
    if (user.city) return user.city;
    if (displayCountryName) return displayCountryName;
    return "Location not specified";
  }, [displayCountryName, user.city]);

  const aboutDisplay = details?.about ?? user.about ?? user.bio ?? null;
  const skillsList = details?.skills ?? [];
  const experienceList = details?.experience ?? [];
  const interestsList = details?.interests ?? [];
  const displayedRole = (details?.role ?? user.role ?? null) as UserRole | null;
  const editableInterestOptions =
    interestDictionary.length > 0
      ? interestDictionary
      : INTEREST_DEFINITIONS.map((interest) => ({
          id: interest.slug,
          slug: interest.slug,
          name: interest.name,
        }));
  const roleSelectOptions = useMemo<PopupSelectOption[]>(
    () =>
      USER_ROLE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    []
  );
  const countrySelectOptions = useMemo<PopupSelectOption[]>(
    () =>
      countries.map((country) => ({
        value: country.code,
        label: country.name,
        icon: countryCodeToFlagEmoji(country.code),
      })),
    []
  );
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

  const handleOpenAllConnectionsList = async () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsAllConnectionsModalOpen(true);
    if (allConnections.length === 0) {
      setAllConnectionsLoading(true);
      try {
        const result = await getProfileConnections(user.id);
        setAllConnections(result.data || []);
      } catch (error) {
        console.error("Failed to load connections:", error);
      } finally {
        setAllConnectionsLoading(false);
      }
    }
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
        skillSlugs: skillSlugsDraft.slice(0, MAX_PROFILE_SKILLS),
        experience: experiencePayload,
        role: roleDraft || null,
        countryCode: countryCodeDraft || null,
        interestSlugs: interestSlugsDraft.slice(0, MAX_INTERESTS),
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
      setSkillSlugsDraft([]);
      setExpDrafts([emptyExpRow()]);
      setRoleDraft((user.role as UserRole | null) ?? "");
      setCountryCodeDraft(user.country_code ?? "");
      setInterestSlugsDraft([]);
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

  const avatarUrl = normalizeTwitterAvatarUrl(user.avatar_url);
  const mutualConnectionsPreview = mutualConnections.slice(0, 3);
  const mutualEventsPreview = mutualEvents.slice(0, 3);
  const missingMutualConnectionsSlots = Math.max(0, 3 - mutualConnectionsPreview.length);
  const missingMutualEventsSlots = Math.max(0, 3 - mutualEventsPreview.length);

  const identityBlock = (
    <div className="min-w-0 max-w-[542px]">
      <h1 className="mb-2 text-white" style={profileNameStyle}>
        {user.twitter_name}
      </h1>
      <p className="mb-4 text-[#70767d]" style={kodeMono15}>
        @{user.twitter_handle}
      </p>

      {displayedRole && (
        <p className="mb-2 flex items-center gap-2 text-[#70767d]" style={kodeMono15}>
          <UserRound className="h-4 w-4 shrink-0 text-[#00ffa3]" aria-hidden />
          <span>{USER_ROLE_LABELS[displayedRole] || displayedRole}</span>
        </p>
      )}

      <p className="mb-4 flex items-center gap-2 text-[#70767d]" style={kodeMono15}>
        <MapPin className="h-4 w-4 shrink-0 text-[#00ffa3]" aria-hidden />
        <span>{location}</span>
      </p>

      <button
        type="button"
        className="group text-left transition-colors duration-150"
        style={kodeMono15}
        onClick={handleOpenAllConnectionsList}
      >
        <span className="text-white">{friendsCount}</span>
        <span className="text-[#70767d] transition-colors duration-150 group-hover:text-white"> connections</span>
      </button>

      {showProfileForm && (
        <div className="mt-6 space-y-3 rounded-[6px] border border-white/10 bg-[#121212] p-3">
          <SearchableSingleSelect
            label="Role"
            placeholder="choose role"
            value={roleDraft}
            onChange={(nextValue) => setRoleDraft(nextValue as UserRole | "")}
            options={roleSelectOptions}
            searchPlaceholder="find role"
          />

          <SearchableSingleSelect
            label="Country"
            placeholder="choose country"
            value={countryCodeDraft}
            onChange={setCountryCodeDraft}
            options={countrySelectOptions}
            searchPlaceholder="find your country"
          />
        </div>
      )}
    </div>
  );

  const aboutSection = (
    <section className="mt-14 max-w-[542px]">
      <h3 className="mb-5 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
        about
      </h3>
      {detailsError && (
        <p className="mb-3 text-xs text-amber-500" style={interBody12}>
          {detailsError}
        </p>
      )}
      {showProfileForm ? (
        <textarea
          className={cn(textareaClass, "min-h-[120px] text-[16px] leading-[24px]")}
          style={{ ...sectionBodyStyle, fontSize: 16, lineHeight: "24px", fontWeight: 500 }}
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
        <p className="whitespace-pre-wrap text-[#e7e7e7]" style={sectionBodyStyle}>
          {aboutDisplay || "No information yet."}
        </p>
      )}
    </section>
  );

  const experienceSection = (
    <section className="mt-16 max-w-[554px]">
      <h3 className="mb-7 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
        experience
      </h3>
      {showProfileForm ? (
        <div className="space-y-4">
          {expDrafts.map((row) => (
            <div key={row.key} className="space-y-2 rounded-[6px] border border-white/10 bg-[#121212] p-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeExperienceRow(row.key)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  aria-label="Remove experience"
                >
                  <Trash2 className="h-4 w-4" />
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
                  setExpDrafts((prev) =>
                    prev.map((r) => (r.key === row.key ? { ...r, company: e.target.value } : r))
                  )
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
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">End (blank = present)</label>
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
            <Plus className="mr-2 h-4 w-4" />
            Add experience
          </Button>
        </div>
      ) : detailsLoading ? (
        <ProfileSectionContentLoader />
      ) : experienceList.length === 0 ? (
        <p className="text-[#70767d]" style={kodeMono15}>
          No experience added yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-6">
          {experienceList.map((e, index) => (
            <li
              key={e.id}
              className={cn(
                "relative min-w-0 border-l border-[rgba(72,72,71,0.3)] pl-[25px]",
                index === experienceList.length - 1 ? "pb-0" : "pb-4"
              )}
            >
              <span
                className={cn(
                  "absolute left-[-7px] top-1 h-3 w-3 rounded-full",
                  index === 0 ? "bg-[#00ffa3]" : "bg-[#484847]"
                )}
              />
              <p
                className={cn(
                  "text-[20px] leading-[30px] text-[#f9f9f9] break-words [overflow-wrap:anywhere]",
                  index !== 0 && "opacity-70"
                )}
                style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 700 }}
              >
                {e.company ? `${e.title} at ${e.company}` : e.title}
              </p>
              {(e.startDate || e.endDate) && (
                <p
                  className={cn("mt-1 text-[#adaaaa] uppercase", index !== 0 && "opacity-70")}
                  style={{ ...kodeMono15, letterSpacing: 1 }}
                >
                  {fmtMonthYear(e.startDate) || "—"} — {fmtMonthYear(e.endDate) || "Present"}
                </p>
              )}
              {e.description && (
                <p
                  className={cn(
                    "mt-2 whitespace-pre-wrap text-[20px] leading-[30px] text-[#adaaaa] break-words [overflow-wrap:anywhere]",
                    index !== 0 && "opacity-70"
                  )}
                  style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 400 }}
                >
                  {e.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const interestsSection = (
    <section>
      <h3 className="mb-4 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
        interested in
      </h3>
      {showProfileForm ? (
        <div className="rounded-[6px] border border-white/10 bg-[#121212] p-3">
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-xs text-[var(--color-text-muted)]">Interests</label>
            <span className="text-[11px] text-white/60">
              Selected {interestSlugsDraft.length}/{MAX_INTERESTS}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {editableInterestOptions.map((interest) => {
              const isSelected = interestSlugsDraft.includes(interest.slug);
              const limitReached = !isSelected && interestSlugsDraft.length >= MAX_INTERESTS;
              return (
                <button
                  key={interest.slug}
                  type="button"
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                    isSelected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                      : limitReached
                        ? "cursor-not-allowed border-white/10 text-white/35"
                        : "border-white/20 text-white/70 hover:border-white/50 hover:text-white"
                  )}
                  onClick={() =>
                    setInterestSlugsDraft((prev) =>
                      prev.includes(interest.slug)
                        ? prev.filter((slug) => slug !== interest.slug)
                        : prev.length >= MAX_INTERESTS
                          ? prev
                          : [...prev, interest.slug]
                    )
                  }
                  disabled={limitReached}
                >
                  {interest.name}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-white/50">You can choose up to {MAX_INTERESTS} interests.</p>
        </div>
      ) : detailsLoading ? (
        <ProfileSectionContentLoader />
      ) : interestsList.length === 0 ? (
        <p className="text-[#70767d]" style={kodeMono15}>
          No interests added yet.
        </p>
      ) : (
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {interestsList.map((interest) => (
            <li key={interest.slug} className="inline-flex items-center gap-2 text-[#adaaaa]" style={skillLabelStyle}>
              <span className="h-1.5 w-1.5 rounded-full bg-[#00ffa3]" />
              <span>{interest.name}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const skillsSection = (
    <section>
      <h3 className="mb-5 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
        skills
      </h3>
      {showProfileForm ? (
        <SkillTagPicker
          categories={skillCategories}
          items={skillDictionary}
          selectedSlugs={skillSlugsDraft}
          onChange={setSkillSlugsDraft}
          maxSelected={MAX_PROFILE_SKILLS}
          searchPlaceholder="Find skills"
          disabled={detailsLoading}
        />
      ) : detailsLoading ? (
        <ProfileSectionContentLoader />
      ) : skillsList.length === 0 ? (
        <p className="text-[#70767d]" style={kodeMono15}>
          No skills added yet.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-[7px]">
          {skillsList.map((s) => (
            <li key={s.slug} className="rounded-[3px] border border-[#282827] bg-[#20201f] px-2.5 py-2 text-[#f9f9f9]">
              <span style={skillLabelStyle}>{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const mutualContextCard = (
    <aside className="w-full rounded-[6px] border border-white/10 bg-[#121212] px-4 pb-[36px] pt-[15px] sm:px-6">
      <h3 className="mb-[37px] text-center uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
        mutual context
      </h3>
      {isOwnProfile ? (
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Mutual context is shown when someone else views your profile.
        </p>
      ) : !isAuthenticated ? (
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Sign in to see mutual connections and shared events.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-8">
          <div className="flex flex-col items-center justify-center text-center">
            <p
              className="min-h-[26px] text-[11px] leading-[1.1] text-[#828282] sm:min-h-0 sm:text-[15px] sm:leading-[1]"
              style={{ fontFamily: "var(--font-kode-mono), monospace", fontWeight: 500 }}
            >
              <span className="block sm:inline">Mutual</span>
              <span className="block sm:inline sm:ml-1">
                connections: <span className="font-bold text-white">{mutualConnectionsCount}</span>
              </span>
            </p>
            <div className="mt-4 flex min-h-[45px] items-center justify-center">
              {mutualConnectionsPreview.map((item, i) => (
                <Link
                  href={`/profile/${item.twitter_handle}`}
                  key={item.id}
                  className="relative h-[45px] w-[45px] shrink-0 overflow-hidden rounded-full border border-black bg-[#0f0f0f]"
                  style={{ marginLeft: i === 0 ? 0 : "-22px", zIndex: i + 1 }}
                >
                  {item.avatar_url ? (
                    <Image src={item.avatar_url} alt={item.twitter_name} width={45} height={45} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-white">
                      {item.twitter_name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </Link>
              ))}
              {Array.from({ length: missingMutualConnectionsSlots }).map((_, i) => {
                const stackIndex = mutualConnectionsPreview.length + i;
                return (
                  <div
                    key={`mutual-connections-placeholder-${i}`}
                    className="relative h-[45px] w-[45px] shrink-0 rounded-full border border-[rgba(72,72,71,0.4)] bg-[#1a1a1a]"
                    style={{ marginLeft: stackIndex === 0 ? 0 : "-22px", zIndex: stackIndex + 1 }}
                  />
                );
              })}
            </div>
            <button
              onClick={handleOpenConnectionsList}
              className="mt-[33px] h-[45px] w-[127px] rounded-[7px] bg-white text-[17px] font-bold tracking-[-0.85px] text-black transition-opacity hover:opacity-90"
              style={kodeMono15}
            >
              Show list
            </button>
          </div>

          <div className="flex flex-col items-center justify-center text-center">
            <p
              className="min-h-[26px] text-[11px] leading-[1.1] text-[#828282] sm:min-h-0 sm:text-[15px] sm:leading-[1]"
              style={{ fontFamily: "var(--font-kode-mono), monospace", fontWeight: 500 }}
            >
              <span className="block sm:inline">Same event</span>
              <span className="block sm:inline sm:ml-1">
                attendee: <span className="font-bold text-white">{mutualEventsCount}</span>
              </span>
            </p>
            <div className="mt-4 flex min-h-[45px] items-center justify-center">
              {mutualEventsPreview.map((event, i) => (
                <Link
                  href={`/events/${event.slug || event.id}`}
                  key={event.id}
                  className="relative h-[45px] w-[45px] shrink-0 overflow-hidden rounded-full border border-black bg-[#0f0f0f]"
                  style={{ marginLeft: i === 0 ? 0 : "-22px", zIndex: i + 1 }}
                >
                  {event.image_url ? (
                    <Image src={event.image_url} alt={event.name} width={45} height={45} className="h-full w-full object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] text-white">
                      Event
                    </div>
                  )}
                </Link>
              ))}
              {Array.from({ length: missingMutualEventsSlots }).map((_, i) => {
                const stackIndex = mutualEventsPreview.length + i;
                return (
                  <div
                    key={`mutual-events-placeholder-${i}`}
                    className="relative h-[45px] w-[45px] shrink-0 rounded-full border border-[rgba(72,72,71,0.4)] bg-[#1a1a1a]"
                    style={{ marginLeft: stackIndex === 0 ? 0 : "-22px", zIndex: stackIndex + 1 }}
                  />
                );
              })}
            </div>
            <button
              onClick={handleOpenEventsList}
              className="mt-[33px] h-[45px] w-[127px] rounded-[7px] bg-white text-[17px] font-bold tracking-[-0.85px] text-black transition-opacity hover:opacity-90"
              style={kodeMono15}
            >
              Show list
            </button>
          </div>
        </div>
      )}
    </aside>
  );

  const actionButtons = (
    <div
      className={cn(
        "mt-[72px] flex items-center justify-end sm:mt-0",
        isOwnProfile ? "flex-wrap gap-3" : "flex-nowrap gap-2"
      )}
    >
      {!isOwnProfile && (
        <>
          <Button
            type="button"
            variant="primary"
            className={figmaConnectButtonClass}
            style={{ fontFamily: "var(--font-kode-mono), monospace", fontWeight: 700 }}
            onClick={handleConnectClick}
            disabled={isConnectLoading}
          >
            {isConnectLoading ? <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" aria-hidden /> : null}
            {connectButtonLabel}
          </Button>
          <button
            type="button"
            className="flex h-[40px] w-[40px] items-center justify-center rounded-[4px] border border-[rgba(72,72,71,0.3)] bg-[#262626] text-white transition-colors hover:bg-[#2f2f2f] sm:h-[44px] sm:w-[44px]"
            aria-label="Save profile"
          >
            <Bookmark className="h-[18px] w-[18px]" />
          </button>
        </>
      )}
      {isOwnProfile && !isEditingProfile && (
        <Button
          type="button"
          variant="outline"
          className="h-[44px] w-full rounded-[5px] border-white/35 text-white hover:bg-white/10 sm:w-[173px]"
          onClick={() => {
            setIsEditingProfile(true);
            setSaveMessage(null);
          }}
          disabled={detailsLoading}
          style={kodeMono15}
        >
          Edit profile
        </Button>
      )}
      {isOwnProfile && isEditingProfile && (
        <>
          <Button
            type="button"
            variant="primary"
            className={cn(figmaConnectButtonCompactClass, "h-[44px] w-full rounded-[5px] sm:w-[173px]")}
            onClick={handleSave}
            disabled={isSaving || detailsLoading}
            style={kodeMono15}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(figmaCancelButtonCompactClass, "h-[44px] w-full rounded-[5px] sm:w-[173px]")}
            onClick={handleCancelEdit}
            disabled={isSaving}
            style={kodeMono15}
          >
            Cancel
          </Button>
        </>
      )}
      {saveMessage && isEditingProfile && (
        <span className="w-full text-right text-sm text-green-500" style={interBody12}>
          {saveMessage}
        </span>
      )}
    </div>
  );

  return (
    <div className="w-full border-x border-white/10 bg-black">
      <div className="grid grid-cols-1 min-[830px]:grid-cols-[minmax(0,54fr)_minmax(0,46fr)] min-[1200px]:grid-cols-[minmax(0,599px)_minmax(0,601px)]">
        <section className="border-b border-white/10 min-[830px]:min-h-[969px] min-[830px]:border-b-0 min-[830px]:border-r min-[830px]:border-r-white/10">
          <div className="relative h-[170px] bg-[#70767d] sm:h-[200px]">
            {user.banner_url && <Image src={user.banner_url} alt="Profile banner" fill className="object-cover" unoptimized />}
          </div>

          <div className="relative px-6 pb-10 pt-3 sm:px-10 min-[830px]:px-8 min-[1200px]:px-[45px]">
            <div className="absolute -top-[60px] left-5 sm:-top-[75px]">
              <div className="relative h-[120px] w-[120px] overflow-hidden rounded-[56px] border-[3px] border-black bg-[#121212] sm:h-[150px] sm:w-[150px] sm:rounded-[69px]">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={user.twitter_name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#1a1a1a] text-4xl font-bold text-white">
                    {(user.twitter_name || user.twitter_handle || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {actionButtons}

            <div className="pt-[62px] sm:pt-[70px]">
              {identityBlock}
              {aboutSection}
              {experienceSection}
            </div>
          </div>
        </section>

        <section className="px-6 pb-10 pt-8 sm:px-10 min-[830px]:min-h-[969px] min-[830px]:px-8 min-[830px]:pt-[61px] min-[1200px]:px-[50px]">
          <div className="mx-auto w-full max-w-[550px] min-[830px]:mx-0">{mutualContextCard}</div>
          <div className="mt-16 max-w-[384px]">{interestsSection}</div>
          <div className="mt-16 max-w-[384px]">{skillsSection}</div>
        </section>
      </div>

      <Modal isOpen={isConnectionsModalOpen} onClose={() => setIsConnectionsModalOpen(false)} size="md" ariaLabel="Mutual connections" className={v2ModalClass} closeButtonClassName={v2CloseButtonClass}>
        <ModalHeader className={v2ModalHeaderClass}>
          <ModalTitle style={v2ModalTitleStyle}>Mutual connections</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="max-h-[60vh] overflow-y-auto">
            {mutualConnectionsCount === 0 ? (
              <p className="py-4 text-center text-sm text-white/50" style={kodeMono15}>No mutual connections.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {mutualConnectionsItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/profile/${item.twitter_handle}`}
                      className="flex items-center gap-3 py-3 transition-opacity hover:opacity-80"
                      onClick={() => setIsConnectionsModalOpen(false)}
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#101319]">
                        {item.avatar_url ? (
                          <Image src={item.avatar_url} alt={item.twitter_name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-white/60">
                            {item.twitter_name?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white" style={{ fontFamily: "var(--font-kode-mono), monospace" }}>
                          {item.twitter_name}
                        </p>
                        <p className="truncate text-xs text-white/50" style={{ fontFamily: "var(--font-kode-mono), monospace" }}>
                          @{item.twitter_handle}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ModalContent>
      </Modal>

      <Modal isOpen={isEventsModalOpen} onClose={() => setIsEventsModalOpen(false)} size="md" ariaLabel="Mutual events" className={v2ModalClass} closeButtonClassName={v2CloseButtonClass}>
        <ModalHeader className={v2ModalHeaderClass}>
          <ModalTitle style={v2ModalTitleStyle}>Same event attendee</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="max-h-[60vh] overflow-y-auto">
            {mutualEventsCount === 0 ? (
              <p className="py-4 text-center text-sm text-white/50" style={kodeMono15}>No shared upcoming events.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {mutualEventsItems.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/events/${event.slug || event.id}`}
                      className="flex items-center gap-3 py-3 transition-opacity hover:opacity-80"
                      onClick={() => setIsEventsModalOpen(false)}
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[5px] border border-white/10 bg-[#101319]">
                        {event.image_url ? (
                          <Image
                            src={event.image_url}
                            alt={event.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/30">
                            <Calendar className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm font-medium text-white"
                          style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                        >
                          {event.name}
                        </p>
                        {event.city && (
                          <p
                            className="mt-0.5 truncate text-xs text-white/70"
                            style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                          >
                            {event.city}
                          </p>
                        )}
                        <p
                          className="mt-0.5 truncate text-xs text-white/40"
                          style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                        >
                          {formatEventDate(event.start_date, event.end_date)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isAllConnectionsModalOpen}
        onClose={() => setIsAllConnectionsModalOpen(false)}
        size="md"
        ariaLabel="Connections list"
        className={v2ModalClass}
        closeButtonClassName={v2CloseButtonClass}
      >
        <ModalHeader className={v2ModalHeaderClass}>
          <ModalTitle style={v2ModalTitleStyle}>
            {isOwnProfile ? "My Connections" : `${user.twitter_name}'s Connections`}
          </ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="max-h-[60vh] overflow-y-auto">
            {allConnectionsLoading ? (
              <ProfileSectionContentLoader />
            ) : allConnections.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/50" style={kodeMono15}>No connections yet.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {allConnections.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/profile/${item.twitter_handle}`}
                      className="flex items-center gap-3 py-3 transition-opacity hover:opacity-80"
                      onClick={() => setIsAllConnectionsModalOpen(false)}
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#101319]">
                        {item.avatar_url ? (
                          <Image src={item.avatar_url} alt={item.twitter_name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-white/60">
                            {item.twitter_name?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white" style={{ fontFamily: "var(--font-kode-mono), monospace" }}>
                          {item.twitter_name}
                        </p>
                        <p className="truncate text-xs text-white/50" style={{ fontFamily: "var(--font-kode-mono), monospace" }}>
                          @{item.twitter_handle}
                        </p>
                      </div>
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
