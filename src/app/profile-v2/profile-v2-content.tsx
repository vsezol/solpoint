"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { AuthRequiredModal, Button, Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui";
import { SkillTagPicker } from "@/components/ui/skill-tag-picker";
import { formControlFocusClasses } from "@/components/ui/form-control-focus";
import {
  Bookmark,
  Calendar,
  Camera,
  ChevronDown,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Send,
  Github,
  Linkedin,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import Cropper from "react-easy-crop";
import type { User } from "@/types";
import type { FriendshipStatus } from "@/types/profile";
import {
  getProfileData,
  getProfileDetails,
  getProfileMutualConnections,
  getProfileMutualEvents,
  getProfileConnections,
  saveProfileDetails,
  uploadProfileAvatar,
  uploadProfileBanner,
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
import { acceptFriendRequest, addFriend, declineFriendRequest, getFriendRequests, getFriendsStats, removeFriend } from "@/lib/api/friends";
import { ProfileFriendRequestsModal } from "@/app/profile/components/profile-friend-requests-modal";
import { getSavedUsers, toggleSavedUser } from "@/lib/api/saved-users";
import { getUserSuggestions } from "@/lib/api/suggestions";
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

/** Figma-ish: Kode Mono 14px / Bold (interests toggles) */
const kodeMono14Bold: CSSProperties = {
  fontFamily: "var(--font-kode-mono), monospace",
  fontWeight: 700,
  fontSize: 14,
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

const spaceGrotesk14Semibold: CSSProperties = {
  fontFamily: "var(--font-display), sans-serif",
  fontWeight: 600,
  fontSize: 14,
  lineHeight: 1,
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

/** Kode Mono variant — used for edit-form tab buttons and field labels */
const fieldLabelStyle: CSSProperties = {
  ...sectionHeadingStyle,
  fontFamily: "var(--font-kode-mono), monospace",
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

/** Drawer main title — reused for section titles like "SOCIAL LINKS" */
const editDrawerTitleStyle: CSSProperties = {
  fontFamily: "var(--font-kode-mono), monospace",
  fontWeight: 700,
  fontSize: 20,
  lineHeight: "12px",
  letterSpacing: "2px",
};

/** Field labels "TELEGRAM USERNAME" / "X USERNAME" — Kode Mono 15 / SemiBold / LH 12 / LS 0 */
const socialLinksFieldLabelStyle: CSSProperties = {
  fontFamily: "var(--font-kode-mono), monospace",
  fontWeight: 600,
  fontSize: 15,
  lineHeight: "12px",
  letterSpacing: 0,
  color: "#ffffff",
};

function normalizeTelegramUsername(stored?: string | null): string {
  if (!stored) return "";
  const t = stored.trim();
  const fromUrl = t.match(/(?:https?:\/\/)?(?:www\.)?t\.me\/([^/?#]+)/i);
  if (fromUrl?.[1]) return decodeURIComponent(fromUrl[1]).replace(/^@/, "");
  return t.replace(/^@/, "");
}

function githubDisplayFromStored(stored?: string | null): string {
  if (!stored?.trim()) return "";
  const t = stored.trim();
  const m = t.match(/github\.com\/([^/?#]+(?:\/[^/?#]+)?)/i);
  if (m) return m[1].replace(/\/$/, "");
  return t.replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/$/, "");
}

function githubToStored(display: string): string {
  const t = display.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://github.com/${t.replace(/^\/+/, "")}`;
}

function linkedinDisplayFromStored(stored?: string | null): string {
  if (!stored?.trim()) return "";
  const t = stored.trim();
  const m = t.match(/linkedin\.com\/([^/?#]+)/i);
  if (m) return m[1].replace(/\/$/, "");
  return t.replace(/^https?:\/\/(www\.)?linkedin\.com\/?/i, "").replace(/\/$/, "");
}

function linkedinToStored(display: string): string {
  const t = display.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (/^linkedin\.com\//i.test(t)) return `https://www.${t}`;
  return `https://www.linkedin.com/in/${t.replace(/^\/+/, "").replace(/^in\//i, "")}`;
}

type SocialLinkPlatform = "telegram" | "twitter" | "github" | "linkedin";

const SOCIAL_PLATFORM_ORDER: readonly SocialLinkPlatform[] = ["telegram", "twitter", "github", "linkedin"];

const SOCIAL_PLATFORM_CONFIG: Record<
  SocialLinkPlatform,
  { menuLabel: string; fieldLabel: string; placeholder: string }
> = {
  telegram: { menuLabel: "Telegram", fieldLabel: "Telegram username", placeholder: "username" },
  twitter: { menuLabel: "Twitter", fieldLabel: "Twitter username", placeholder: "handle" },
  github: { menuLabel: "GitHub", fieldLabel: "GitHub username", placeholder: "username or org/repo" },
  linkedin: { menuLabel: "LinkedIn", fieldLabel: "LinkedIn profile", placeholder: "in/username or URL" },
};

function buildSocialDraftsFromUser(user: User): Record<SocialLinkPlatform, string> {
  return {
    telegram: normalizeTelegramUsername(user.socials?.telegram),
    twitter: (user.twitter_handle || "").replace(/^@/, ""),
    github: githubDisplayFromStored(user.socials?.github),
    linkedin: linkedinDisplayFromStored(user.socials?.linkedin),
  };
}

function initialActiveSocialOrderFromDrafts(drafts: Record<SocialLinkPlatform, string>): SocialLinkPlatform[] {
  return SOCIAL_PLATFORM_ORDER.filter((p) => (drafts[p] || "").trim() !== "");
}

function SocialLinkPlatformIcon({
  platform,
  className,
}: {
  platform: SocialLinkPlatform;
  className?: string;
}) {
  const iconClass =
    className ?? "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45";
  switch (platform) {
    case "telegram":
      return <Send className={iconClass} aria-hidden />;
    case "twitter":
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          aria-hidden
          fill="currentColor"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "github":
      return <Github className={iconClass} aria-hidden />;
    case "linkedin":
      return <Linkedin className={iconClass} aria-hidden />;
    default:
      return null;
  }
}

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

function experienceSortKey(startDate?: string | null, endDate?: string | null) {
  // Month inputs are "YYYY-MM". Treat blank end as "present" (highest).
  const endRank = endDate?.trim() ? endDate.trim() : "9999-12";
  const startRank = startDate?.trim() ? startDate.trim() : "0000-00";
  return { endRank, startRank };
}

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
  "profile-v2-field w-full min-h-[100px] rounded-[5px] border border-[#5e5e5e] bg-[#0F0F0F] px-3 py-2 text-[14px] font-semibold text-white placeholder:text-[#a4a7ac]",
  formControlFocusClasses
);

const inputClass = cn(
  "profile-v2-field w-full h-[40px] rounded-[5px] border border-[#5e5e5e] bg-[#0F0F0F] px-3 text-[14px] font-semibold text-white placeholder:text-[#a4a7ac]",
  formControlFocusClasses
);

const profileFilterTriggerClass =
  "flex h-[40px] w-full items-center justify-between rounded-[5px] border border-[#5e5e5e] bg-[#0F0F0F] px-3 text-left text-[14px] font-semibold text-white";

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
      {label ? (
        <label className="mb-1 block text-xs text-[var(--color-text-muted)]">{label}</label>
      ) : null}

      <button
        type="button"
        className={profileFilterTriggerClass}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span
          className={cn("flex min-w-0 items-center gap-2 truncate", !selected && "text-white/55")}
          style={
            selected
              ? {
                  fontFamily: "var(--font-display), sans-serif",
                  fontWeight: 700,
                  fontSize: 15,
                  lineHeight: "normal",
                  letterSpacing: 0,
                }
              : undefined
          }
        >
          {selected?.icon ? <span aria-hidden>{selected.icon}</span> : null}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-white/70 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-[5px] border border-[#2A2A2A] bg-black py-3 pl-3 pr-0 shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
          style={{ fontFamily: "var(--font-kode-mono), monospace" }}
        >
          <div className="mb-3 mr-3 flex h-9 items-center rounded-[5px] border border-[#2A2A2A] bg-black px-3 transition-colors focus-within:border-[#5A5A5A]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder ?? `find ${label.toLowerCase()}`}
              className="profile-v2-field w-full border-0 bg-transparent text-[13px] text-white placeholder:text-white/45 focus:outline-none"
              style={{ fontFamily: "var(--font-kode-mono), monospace" }}
            />
          </div>

          <div className="profile-v2-scrollbar max-h-44 overflow-y-auto pr-3">
            <button
              type="button"
              className="flex w-full items-center justify-between px-1 py-1.5 text-left text-[14px] font-bold text-white hover:bg-white/5"
              style={{ letterSpacing: "-0.05em", lineHeight: "normal" }}
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
            >
              <span>All</span>
              <span className={cn("h-[13px] w-[13px] rounded-[2px] border", !value ? "border-white bg-white" : "border-white/40")} />
            </button>

            {filteredOptions.map((option) => {
              const checked = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-1 py-1.5 text-left text-[14px] font-bold text-white hover:bg-white/5"
                  style={{ letterSpacing: "-0.05em", lineHeight: "normal" }}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    {option.icon ? <span aria-hidden>{option.icon}</span> : null}
                    <span className="truncate">{option.label}</span>
                  </span>
                  <span className={cn("h-[13px] w-[13px] rounded-[2px] border", checked ? "border-white bg-white" : "border-white/40")} />
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
  const ABOUT_MAX = 200;
  const [friendsCount, setFriendsCount] = useState(0);
  const [connectionRequestsCount, setConnectionRequestsCount] = useState(0);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>(initialFriendshipStatus);
  const [isConnectLoading, setIsConnectLoading] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [requests, setRequests] = useState<User[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(false);
  const [requestActionUserId, setRequestActionUserId] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isSavedUser, setIsSavedUser] = useState(false);
  const [savedUsers, setSavedUsers] = useState<Array<Pick<User, "id" | "twitter_name" | "avatar_url" | "city" | "country" | "role" | "is_verified" | "subscription_tier">>>([]);
  const [savedUsersLoading, setSavedUsersLoading] = useState(false);
  const [savedUsersModalOpen, setSavedUsersModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<Pick<User, "id" | "twitter_name" | "avatar_url" | "city" | "country" | "role" | "is_verified" | "subscription_tier">>>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsModalOpen, setSuggestionsModalOpen] = useState(false);

  const [details, setDetails] = useState<ProfileDetailsResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [displayNameDraft, setDisplayNameDraft] = useState(user.twitter_name ?? "");
  const [cityDraft, setCityDraft] = useState(user.city ?? "");

  const [displayNameLocal, setDisplayNameLocal] = useState(user.twitter_name ?? "");
  const [cityLocal, setCityLocal] = useState(user.city ?? "");
  const [avatarUrlLocal, setAvatarUrlLocal] = useState(user.avatar_url ?? "");
  const [bannerUrlLocal, setBannerUrlLocal] = useState(user.banner_url ?? "");
  const [isBannerUploading, setIsBannerUploading] = useState(false);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPendingFile, setAvatarPendingFile] = useState<File | null>(null);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [isAvatarCropOpen, setIsAvatarCropOpen] = useState(false);
  const [avatarCrop, setAvatarCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarCroppedAreaPixels, setAvatarCroppedAreaPixels] = useState<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);

  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);
  const [isBannerCropOpen, setIsBannerCropOpen] = useState(false);
  const [bannerCrop, setBannerCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [bannerZoom, setBannerZoom] = useState(1);
  const [bannerCroppedAreaPixels, setBannerCroppedAreaPixels] = useState<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);

  const [aboutDraft, setAboutDraft] = useState("");
  const [skillSlugsDraft, setSkillSlugsDraft] = useState<string[]>([]);
  const [expDrafts, setExpDrafts] = useState<ExpFormRow[]>([emptyExpRow()]);
  const [expandedExpIds, setExpandedExpIds] = useState<Set<string>>(new Set());
  const [roleDraft, setRoleDraft] = useState<UserRole | "">("");
  const [countryCodeDraft, setCountryCodeDraft] = useState("");
  const [interestSlugsDraft, setInterestSlugsDraft] = useState<string[]>([]);
  const [interestDictionary, setInterestDictionary] = useState<Interest[]>([]);
  const [skillDictionary, setSkillDictionary] = useState(SKILL_DEFINITIONS);
  const [skillCategories, setSkillCategories] = useState(SKILL_CATEGORIES);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  /** Own profile: view (lists) vs edit (drawer). Guests always see view. */
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState<"personal" | "professional" | "social">("personal");

  const [socialDrafts, setSocialDrafts] = useState<Record<SocialLinkPlatform, string>>({
    telegram: "",
    twitter: "",
    github: "",
    linkedin: "",
  });
  const [activeSocialOrder, setActiveSocialOrder] = useState<SocialLinkPlatform[]>([]);
  const [socialAddMenuOpen, setSocialAddMenuOpen] = useState(false);
  const socialAddMenuRef = useRef<HTMLDivElement>(null);

  const socialPlatformsAvailableToAdd = useMemo(
    () => SOCIAL_PLATFORM_ORDER.filter((p) => !activeSocialOrder.includes(p)),
    [activeSocialOrder]
  );

  const MAX_INTERESTS = 4;

  const [mutualConnections, setMutualConnections] = useState<MutualConnection[]>([]);
  const [mutualConnectionsItems, setMutualConnectionsItems] = useState<MutualConnection[]>([]);
  const [mutualConnectionsCount, setMutualConnectionsCount] = useState(0);
  const [mutualEvents, setMutualEvents] = useState<MutualEvent[]>([]);
  const [mutualEventsItems, setMutualEventsItems] = useState<MutualEvent[]>([]);
  const [mutualEventsCount, setMutualEventsCount] = useState(0);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false);
  const [isEventsModalOpen, setIsEventsModalOpen] = useState(false);
  const [isAllExperienceModalOpen, setIsAllExperienceModalOpen] = useState(false);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!socialAddMenuOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (!socialAddMenuRef.current?.contains(event.target as Node)) {
        setSocialAddMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [socialAddMenuOpen]);

  const [isAllConnectionsModalOpen, setIsAllConnectionsModalOpen] = useState(false);
  const [allConnections, setAllConnections] = useState<MutualConnection[]>([]);
  const [allConnectionsLoading, setAllConnectionsLoading] = useState(false);

  const applyDetails = useCallback(
    (d: ProfileDetailsResponse) => {
      setDetails(d);
      if (isOwnProfile) {
        setAboutDraft(d.about ?? "");
        setCityDraft(d.city ?? user.city ?? "");
        setCityLocal(d.city ?? user.city ?? "");
        setSkillSlugsDraft(d.skills.map((s) => s.slug).slice(0, MAX_PROFILE_SKILLS));
        setExpDrafts(detailsToExpDrafts(d));
        setRoleDraft((d.role as UserRole | null) ?? "");
        setCountryCodeDraft(d.countryCode ?? "");
        setInterestSlugsDraft((d.interestSlugs ?? []).slice(0, MAX_INTERESTS));
        setSocialDrafts(buildSocialDraftsFromUser(user));
      }
    },
    [MAX_INTERESTS, isOwnProfile, user.city, user.socials, user.twitter_handle]
  );

  const wasEditingProfileRef = useRef(false);
  useEffect(() => {
    if (isEditingProfile && !wasEditingProfileRef.current && isOwnProfile) {
      const d = buildSocialDraftsFromUser(user);
      setSocialDrafts(d);
      setActiveSocialOrder(initialActiveSocialOrderFromDrafts(d));
    }
    wasEditingProfileRef.current = isEditingProfile;
  }, [isEditingProfile, isOwnProfile, user]);

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

  // Lock body scroll and handle Esc while the edit drawer is open
  useEffect(() => {
    if (!isEditingProfile) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) {
        handleCancelEdit();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingProfile, isSaving]);

  useEffect(() => {
    if (!isAllExperienceModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsAllExperienceModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isAllExperienceModalOpen]);

  useEffect(() => {
    setDisplayNameDraft(user.twitter_name ?? "");
    setDisplayNameLocal(user.twitter_name ?? "");
    setCityDraft(user.city ?? "");
    setCityLocal(user.city ?? "");
    setAvatarUrlLocal(user.avatar_url ?? "");
    setBannerUrlLocal(user.banner_url ?? "");
  }, [user.avatar_url, user.banner_url, user.city, user.twitter_name]);

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

      if (isAuthenticated && isOwnProfile) {
        try {
          const stats = await getFriendsStats();
          if (!cancelled) {
            setConnectionRequestsCount(stats.friendRequestsCount || 0);
          }
        } catch (error) {
          console.error("Failed to load friends stats:", error);
          if (!cancelled) {
            setConnectionRequestsCount(0);
          }
        }
      }

      if (isAuthenticated && isOwnProfile) {
        if (!cancelled) {
          setSavedUsersLoading(true);
          setSuggestionsLoading(true);
        }
        try {
          const [saved, sugg] = await Promise.all([getSavedUsers(), getUserSuggestions()]);
          if (!cancelled) {
            setSavedUsers(saved || []);
            setSuggestions(sugg || []);
          }
        } catch (error) {
          console.error("Failed to load saved/suggestions:", error);
          if (!cancelled) {
            setSavedUsers([]);
            setSuggestions([]);
          }
        } finally {
          if (!cancelled) {
            setSavedUsersLoading(false);
            setSuggestionsLoading(false);
          }
        }
      }

      if (isAuthenticated && !isOwnProfile) {
        // Best-effort: show bookmark state for this viewed user
        try {
          const saved = await getSavedUsers();
          if (!cancelled) {
            setIsSavedUser(Boolean(saved?.some((u) => u.id === user.id)));
          }
        } catch {
          // ignore
        }
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

  const countryNameByCode = useMemo(
    () => new Map(countries.map((country) => [country.code, country.name])),
    []
  );

  const displayCountryName =
    details?.country || (user as User & { countries?: { name?: string } }).countries?.name || user.country || null;

  const location = useMemo(() => {
    const resolvedCity = cityLocal || "";
    if (resolvedCity && displayCountryName) return `${resolvedCity}, ${displayCountryName}`;
    if (resolvedCity) return resolvedCity;
    if (displayCountryName) return displayCountryName;
    return "Location not specified";
  }, [cityLocal, displayCountryName]);

  const aboutDisplay = details?.about ?? user.about ?? user.bio ?? null;
  const skillsList = details?.skills ?? [];
  const experienceList = useMemo(() => {
    const list = details?.experience ?? [];
    const sorted = [...list];
    sorted.sort((a, b) => {
      const ak = experienceSortKey(a.startDate, a.endDate);
      const bk = experienceSortKey(b.startDate, b.endDate);

      // Higher end date first; "present" rows go to the top.
      if (ak.endRank !== bk.endRank) return bk.endRank.localeCompare(ak.endRank);

      // If both are present (or same end), earlier start goes higher (per requirement for multiple ongoing).
      const bothPresent = ak.endRank === "9999-12" && bk.endRank === "9999-12";
      if (bothPresent) return ak.startRank.localeCompare(bk.startRank);

      // Otherwise, for finished roles with same end month, newer start goes higher.
      return bk.startRank.localeCompare(ak.startRank);
    });
    return sorted;
  }, [details?.experience]);
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
        displayName: displayNameDraft.trim() || null,
        city: cityDraft.trim() || null,
        about: aboutDraft.trim() || null,
        skillSlugs: skillSlugsDraft.slice(0, MAX_PROFILE_SKILLS),
        experience: experiencePayload,
        role: roleDraft || null,
        countryCode: countryCodeDraft || null,
        interestSlugs: interestSlugsDraft.slice(0, MAX_INTERESTS),
      });

      const socialPayload = {
        telegram:
          activeSocialOrder.includes("telegram") && socialDrafts.telegram.trim()
            ? socialDrafts.telegram.trim().replace(/^@/, "")
            : null,
        github:
          activeSocialOrder.includes("github") && socialDrafts.github.trim()
            ? githubToStored(socialDrafts.github)
            : null,
        linkedin:
          activeSocialOrder.includes("linkedin") && socialDrafts.linkedin.trim()
            ? linkedinToStored(socialDrafts.linkedin)
            : null,
      };
      const socialRes = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socials: socialPayload }),
      });
      const socialData = (await socialRes.json().catch(() => ({}))) as { error?: string };
      if (!socialRes.ok) {
        throw new Error(socialData.error || "Failed to save social links");
      }

      applyDetails(saved);
      setDisplayNameLocal(displayNameDraft.trim());
      setCityLocal(cityDraft.trim());
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
    const d = buildSocialDraftsFromUser(user);
    setSocialDrafts(d);
    setActiveSocialOrder(initialActiveSocialOrderFromDrafts(d));
    setSocialAddMenuOpen(false);
    setIsEditingProfile(false);
    setSaveMessage(null);
  };

  const handleAvatarPick = async (file: File) => {
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      setAvatarPendingFile(file);
      setAvatarCropSrc(dataUrl);
      setAvatarCrop({ x: 0, y: 0 });
      setAvatarZoom(1);
      setAvatarCroppedAreaPixels(null);
      setIsAvatarCropOpen(true);
    } catch (error) {
      console.error("Failed to prepare avatar:", error);
      alert(error instanceof Error ? error.message : "Failed to prepare avatar");
    }
  };

  const cropImageToBlob = async (dataUrl: string, cropRect: { x: number; y: number; width: number; height: number }) => {
    const image = document.createElement("img");
    image.crossOrigin = "anonymous";
    const imgLoaded: HTMLImageElement = await new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load image"));
      image.src = dataUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(cropRect.width));
    canvas.height = Math.max(1, Math.round(cropRect.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    ctx.drawImage(
      imgLoaded,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Failed to create image blob"))),
        "image/jpeg",
        0.92
      );
    });
    return blob;
  };

  const handleConfirmAvatarCrop = async () => {
    if (!isAuthenticated || !isOwnProfile || isAvatarUploading) return;
    if (!avatarCropSrc || !avatarCroppedAreaPixels) return;
    setIsAvatarUploading(true);
    try {
      const blob = await cropImageToBlob(avatarCropSrc, avatarCroppedAreaPixels);
      const file = new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" });
      const { avatar_url } = await uploadProfileAvatar(file);
      setAvatarUrlLocal(avatar_url);
      setIsAvatarCropOpen(false);
      setAvatarPendingFile(null);
      setAvatarCropSrc(null);
      await queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
    } catch (error) {
      console.error("Failed to upload cropped avatar:", error);
      alert(error instanceof Error ? error.message : "Failed to upload avatar");
    } finally {
      setIsAvatarUploading(false);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
    }
  };

  const handleCloseAvatarCrop = () => {
    if (isAvatarUploading) return;
    setIsAvatarCropOpen(false);
    setAvatarPendingFile(null);
    setAvatarCropSrc(null);
    setAvatarCroppedAreaPixels(null);
    if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
  };

  const handleBannerPick = async (file: File) => {
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      setBannerCropSrc(dataUrl);
      setBannerCrop({ x: 0, y: 0 });
      setBannerZoom(1);
      setBannerCroppedAreaPixels(null);
      setIsBannerCropOpen(true);
    } catch (error) {
      console.error("Failed to prepare banner:", error);
      alert(error instanceof Error ? error.message : "Failed to prepare banner");
    }
  };

  const cropImageToBlobSized = async (
    dataUrl: string,
    cropRect: { x: number; y: number; width: number; height: number },
    targetWidth: number,
    targetHeight: number
  ) => {
    const image = document.createElement("img");
    image.crossOrigin = "anonymous";
    const imgLoaded: HTMLImageElement = await new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load image"));
      image.src = dataUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    ctx.drawImage(
      imgLoaded,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      0,
      0,
      targetWidth,
      targetHeight
    );

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Failed to create image blob"))),
        "image/jpeg",
        0.9
      );
    });
    return blob;
  };

  const handleConfirmBannerCrop = async () => {
    if (!isAuthenticated || !isOwnProfile || isBannerUploading) return;
    if (!bannerCropSrc || !bannerCroppedAreaPixels) return;
    setIsBannerUploading(true);
    try {
      const blob = await cropImageToBlobSized(bannerCropSrc, bannerCroppedAreaPixels, 1200, 400);
      const file = new File([blob], "banner.jpg", { type: blob.type || "image/jpeg" });
      const { banner_url } = await uploadProfileBanner(file);
      setBannerUrlLocal(banner_url);
      setIsBannerCropOpen(false);
      setBannerCropSrc(null);
      await queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
    } catch (error) {
      console.error("Failed to upload cropped banner:", error);
      alert(error instanceof Error ? error.message : "Failed to upload banner");
    } finally {
      setIsBannerUploading(false);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = "";
    }
  };

  const handleCloseBannerCrop = () => {
    if (isBannerUploading) return;
    setIsBannerCropOpen(false);
    setBannerCropSrc(null);
    setBannerCroppedAreaPixels(null);
    if (bannerFileInputRef.current) bannerFileInputRef.current.value = "";
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

  const avatarUrl = normalizeTwitterAvatarUrl(avatarUrlLocal);
  const mutualConnectionsPreview = mutualConnections.slice(0, 3);
  const mutualEventsPreview = mutualEvents.slice(0, 3);
  const missingMutualConnectionsSlots = Math.max(0, 3 - mutualConnectionsPreview.length);
  const missingMutualEventsSlots = Math.max(0, 3 - mutualEventsPreview.length);

  const canViewSocials = isOwnProfile || friendshipStatus === "accepted";

  const socialLinks = useMemo(() => {
    if (!canViewSocials) return [];
    const items: { platform: SocialLinkPlatform; href: string }[] = [];

    const twitter = (user.twitter_handle || "").replace(/^@/, "").trim();
    if (twitter) items.push({ platform: "twitter", href: `https://x.com/${twitter}` });

    const telegram = normalizeTelegramUsername(user.socials?.telegram);
    if (telegram) items.push({ platform: "telegram", href: `https://t.me/${telegram.replace(/^@/, "")}` });

    const githubStored = user.socials?.github?.trim();
    if (githubStored) items.push({ platform: "github", href: githubStored });

    const linkedinStored = user.socials?.linkedin?.trim();
    if (linkedinStored) items.push({ platform: "linkedin", href: linkedinStored });

    // Keep the intended order.
    return SOCIAL_PLATFORM_ORDER.flatMap((platform) => {
      const match = items.find((item) => item.platform === platform);
      return match ? [match] : [];
    });
  }, [canViewSocials, user.socials?.github, user.socials?.linkedin, user.socials?.telegram, user.twitter_handle]);

  const identityBlock = (
    <div className="min-w-0 max-w-[542px]">
      <h1 className="mb-2 text-white" style={profileNameStyle}>
        {displayNameLocal}
      </h1>
      {user.twitter_handle ? (
        <p className="mb-4 text-[#70767d]" style={kodeMono15}>
            @{user.twitter_handle}
        </p>
      ) : null}

      {displayedRole && (
        <p className="mb-2 flex items-center gap-2 text-[#00ffa3]" style={kodeMono15}>
          <UserRound className="h-4 w-4 shrink-0 text-[#00ffa3]" aria-hidden />
          <span>{USER_ROLE_LABELS[displayedRole] || displayedRole}</span>
        </p>
      )}

      <p className="mb-6 flex items-center gap-2 text-[#00ffa3] sm:mb-4" style={kodeMono15}>
        <MapPin className="h-4 w-4 shrink-0 text-[#00ffa3]" aria-hidden />
        <span>{location}</span>
      </p>

      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-0">
        <button
          type="button"
          className="group text-left transition-colors duration-150"
          style={kodeMono15}
          onClick={handleOpenAllConnectionsList}
        >
          <span className="text-white">{friendsCount}</span>
          <span className="text-[#70767d] transition-colors duration-150 group-hover:text-white"> connections</span>
        </button>

        {isOwnProfile ? (
          <button
            type="button"
            className="group text-left transition-colors duration-150 sm:ml-[20px]"
            style={kodeMono15}
            onClick={() => void openRequestsModal()}
            disabled={isRequestsLoading}
          >
            <span style={{ color: connectionRequestsCount > 0 ? "#16F196" : "#ffffff" }}>
              {connectionRequestsCount}
            </span>{" "}
            <span className="text-[#70767d] transition-colors duration-150 group-hover:text-white">
              connection requests
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );

  const aboutSection = (
    <section className="max-w-[542px]">
      <h3 className="mb-5 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
        about
      </h3>
      {detailsError && (
        <p className="mb-3 text-xs text-amber-500" style={interBody12}>
          {detailsError}
        </p>
      )}
      {detailsLoading ? (
        <ProfileSectionContentLoader />
      ) : (
        <p className="whitespace-pre-wrap text-[#e7e7e7]" style={sectionBodyStyle}>
          {aboutDisplay || "No information yet."}
        </p>
      )}
    </section>
  );

  const experienceSection = (
    <section className="max-w-[554px]">
      <h3 className="mb-7 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
        experience
      </h3>
      {detailsLoading ? (
        <ProfileSectionContentLoader />
      ) : experienceList.length === 0 ? (
        <p className="text-[#70767d]" style={kodeMono15}>
          No experience added yet.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-6">
            {experienceList.slice(0, 2).map((e, index) => (
              <li key={e.id} className="flex gap-0">
                {/* Left: dot + line */}
                <div className="relative flex flex-col items-center" style={{ width: 20, minWidth: 20 }}>
                  <span
                    className={cn("shrink-0 rounded-full", index === 0 ? "bg-[#00ffa3]" : "bg-[#484847]")}
                    style={{ width: 12, height: 12, marginTop: 8 }}
                  />
                  <div className="w-px flex-1" style={{ backgroundColor: "rgba(72,72,71,0.3)" }} />
                </div>
                {/* Right: content */}
                <div className="flex-1 min-w-0 pl-4">
                  <p
                    className={cn("text-[20px] leading-[30px] text-[#f9f9f9]", index !== 0 && "opacity-70")}
                    style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 700 }}
                  >
                    {e.company ? `${e.title} at ${e.company}` : e.title}
                  </p>
                  {(e.startDate || e.endDate) && (
                    <p
                      className={cn("mt-1 text-[15px] leading-[22px] text-[#adaaaa] uppercase", index !== 0 && "opacity-70")}
                      style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 400, letterSpacing: 1 }}
                    >
                      {fmtMonthYear(e.startDate) || "—"} — {fmtMonthYear(e.endDate) || "Present"}
                    </p>
                  )}
                  {e.description && (
                    <div>
                      <p
                        className={cn(
                          "mt-2 text-[20px] leading-[30px] text-[#adaaaa] break-words",
                          index !== 0 && "opacity-70",
                          !expandedExpIds.has(e.id) && "line-clamp-4"
                        )}
                        style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 300, overflowWrap: "break-word" }}
                      >
                        {e.description}
                      </p>
                      {e.description.length > 90 && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedExpIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(e.id)) {
                                  next.delete(e.id);
                                } else {
                                  next.add(e.id);
                                }
                                return next;
                              })
                            }
                            className="mt-1 text-[15px] text-[#00ffa3] hover:opacity-80 transition-opacity"
                            style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 500 }}
                          >
                            {expandedExpIds.has(e.id) ? "Show less" : "Show more"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {experienceList.length > 2 && (
            <button
              type="button"
              onClick={() => setIsAllExperienceModalOpen(true)}
              className="mt-6 w-full py-3 text-[15px] text-[#adaaaa] hover:text-white transition-colors"
              style={{
                fontFamily: "var(--font-kode-mono), monospace",
                fontWeight: 600,
                fontSize: 14,
                borderRadius: 7,
                border: "1px solid transparent",
                background: "linear-gradient(#000000, #000000) padding-box, linear-gradient(to right, #9849FC, #01F48B) border-box",
              }}
            >
              Show all {experienceList.length}{" "}
              {experienceList.length === 1 ? "experience" : "experiences"}
            </button>
          )}
        </>
      )}
    </section>
  );

  const interestsSection = (
    <section>
      <h3 className="mb-4 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
        interested in
      </h3>
      {detailsLoading ? (
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

  const socialsSection = (
    <section className="max-w-[384px]">
      <h3 className="mb-4 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
        socials
      </h3>
      {!canViewSocials ? (
        <p className="text-[#70767d]" style={kodeMono15}>
          Connect to view socials.
        </p>
      ) : socialLinks.length === 0 ? (
        <p className="text-[#70767d]" style={kodeMono15}>
          No socials added yet.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {socialLinks.map((item) => (
            <a
              key={item.platform}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] bg-white/10 text-white/70 transition-colors hover:text-white hover:bg-white/15"
              aria-label={`Open ${SOCIAL_PLATFORM_CONFIG[item.platform].menuLabel}`}
            >
              <SocialLinkPlatformIcon platform={item.platform} className="h-4 w-4 text-current" />
            </a>
          ))}
        </div>
      )}
    </section>
  );

  const skillsSection = (
    <section>
      <h3 className="mb-5 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
        skills
      </h3>
      {detailsLoading ? (
        <ProfileSectionContentLoader />
      ) : skillsList.length === 0 ? (
        <p className="text-[#70767d]" style={kodeMono15}>
          No skills added yet.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1 sm:gap-[7px]">
          {skillsList.map((s) => (
            <li key={s.slug} className="rounded-[3px] border border-[#282827] bg-[#20201f] px-1 py-0.5 text-[#f9f9f9] sm:px-2.5 sm:py-2">
              <span className="text-[10px] sm:text-[13px]" style={skillLabelStyle}>{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const mutualContextCard = (
    <div
      className="w-full rounded-[6px] p-px"
      style={{
        background: "linear-gradient(180deg, #00F68B 0%, #000000 100%)",
      }}
    >
      <aside className="w-full rounded-[6px] bg-[#121212] px-4 pb-[36px] pt-[15px] sm:px-6">
        <h3 className="mb-[37px] text-center uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
          {isOwnProfile ? "my network" : "mutual context"}
        </h3>
        {isOwnProfile ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-8">
            {/* Saved users */}
            <div className="flex flex-col items-center justify-center text-center">
              <p
                className="min-h-[26px] text-[11px] leading-[1.1] text-[#828282] sm:min-h-0 sm:text-[15px] sm:leading-[1]"
                style={{ fontFamily: "var(--font-kode-mono), monospace", fontWeight: 500 }}
              >
                Saved users:{" "}
                <span className="font-bold text-white">
                  {savedUsersLoading ? "…" : savedUsers.length}
                </span>
              </p>
              <div className="mt-4 flex min-h-[45px] items-center justify-center">
                {(savedUsers || []).slice(0, 3).map((item, i) => (
                  <Link
                    href={`/profile/${item.id}`}
                    key={item.id}
                    className="relative h-[45px] w-[45px] shrink-0 overflow-hidden rounded-full border border-black bg-[#0f0f0f]"
                    style={{ marginLeft: i === 0 ? 0 : "-22px", zIndex: i + 1 }}
                  >
                    {item.avatar_url ? (
                      <Image src={item.avatar_url} alt={item.twitter_name} width={45} height={45} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-white">
                        {(item.twitter_name || "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
              <button
                onClick={() => setSavedUsersModalOpen(true)}
                className="mt-[33px] h-[45px] w-[127px] rounded-[7px] bg-white text-[17px] tracking-[-0.85px] text-black transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ ...kodeMono15, fontWeight: 800 }}
                disabled={savedUsersLoading || savedUsers.length === 0}
              >
                Show list
              </button>
            </div>

            {/* Suggestions */}
            <div className="flex flex-col items-center justify-center text-center">
              <p
                className="min-h-[26px] text-[11px] leading-[1.1] text-[#828282] sm:min-h-0 sm:text-[15px] sm:leading-[1]"
                style={{ fontFamily: "var(--font-kode-mono), monospace", fontWeight: 500 }}
              >
                User suggestions:{" "}
                <span className="font-bold text-white">
                  {suggestionsLoading ? "…" : suggestions.length}
                </span>
              </p>
              <div className="mt-4 flex min-h-[45px] items-center justify-center">
                {(suggestions || []).slice(0, 3).map((item, i) => (
                  <Link
                    href={`/profile/${item.id}`}
                    key={item.id}
                    className="relative h-[45px] w-[45px] shrink-0 overflow-hidden rounded-full border border-black bg-[#0f0f0f]"
                    style={{ marginLeft: i === 0 ? 0 : "-22px", zIndex: i + 1 }}
                  >
                    {item.avatar_url ? (
                      <Image src={item.avatar_url} alt={item.twitter_name} width={45} height={45} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-white">
                        {(item.twitter_name || "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
              <button
                onClick={() => setSuggestionsModalOpen(true)}
                className="mt-[33px] h-[45px] w-[127px] rounded-[7px] bg-white text-[17px] tracking-[-0.85px] text-black transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ ...kodeMono15, fontWeight: 800 }}
                disabled={suggestionsLoading || suggestions.length === 0}
              >
                Show list
              </button>
            </div>
          </div>
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
                  href={`/profile/${item.id}`}
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
              className="mt-[33px] h-[45px] w-[127px] rounded-[7px] bg-white text-[17px] tracking-[-0.85px] text-black transition-opacity hover:opacity-90"
              style={{ ...kodeMono15, fontWeight: 800 }}
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
              className="mt-[33px] h-[45px] w-[127px] rounded-[7px] bg-white text-[17px] tracking-[-0.85px] text-black transition-opacity hover:opacity-90"
              style={{ ...kodeMono15, fontWeight: 800 }}
            >
              Show list
            </button>
          </div>
        </div>
        )}
      </aside>
    </div>
  );

  const actionButtons = (
    <div
      className={cn(
        "mt-0 flex items-center justify-end sm:mt-0",
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
            disabled={isSavingUser}
            onClick={async () => {
              if (isSavingUser) return;
              setIsSavingUser(true);
              try {
                const next = await toggleSavedUser(user.id);
                setIsSavedUser(Boolean(next.saved));
              } catch (error) {
                console.error("Failed to toggle saved user:", error);
              } finally {
                setIsSavingUser(false);
              }
            }}
          >
            <Bookmark
              className={cn("h-[18px] w-[18px] transition-colors", isSavedUser ? "fill-white text-white" : "fill-transparent text-white")}
            />
          </button>
        </>
      )}
      {isOwnProfile && (
        <Button
          type="button"
          variant="outline"
          className="h-[44px] w-[130px] rounded-[5px] border-white/35 text-white hover:bg-white/10 sm:w-[173px] font-extrabold"
          onClick={() => {
            setIsEditingProfile(true);
            setActiveEditTab("personal");
            setSaveMessage(null);
          }}
          disabled={detailsLoading}
          style={kodeMono15}
        >
          Edit profile
        </Button>
      )}
    </div>
  );

  const openRequestsModal = async () => {
    if (!isOwnProfile || !isAuthenticated) return;
    setIsRequestsModalOpen(true);
    setIsRequestsLoading(true);
    try {
      const items = await getFriendRequests();
      setRequests(items || []);
      setConnectionRequestsCount(items?.length || 0);
    } catch (error) {
      console.error("Failed to load friend requests:", error);
      setRequests([]);
    } finally {
      setIsRequestsLoading(false);
    }
  };

  const handleAcceptRequest = async (friendId: string) => {
    if (requestActionUserId) return;
    setRequestActionUserId(friendId);
    try {
      await acceptFriendRequest(friendId);
      setRequests((prev) => prev.filter((u) => u.id !== friendId));
      setConnectionRequestsCount((prev) => Math.max(0, prev - 1));
      setFriendsCount((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to accept friend request:", error);
    } finally {
      setRequestActionUserId(null);
    }
  };

  const handleIgnoreRequest = async (friendId: string) => {
    if (requestActionUserId) return;
    setRequestActionUserId(friendId);
    try {
      await declineFriendRequest(friendId);
      setRequests((prev) => prev.filter((u) => u.id !== friendId));
      setConnectionRequestsCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to decline friend request:", error);
    } finally {
      setRequestActionUserId(null);
    }
  };

  return (
    <div className="w-full border-x border-white/10 bg-black">
      <ProfileFriendRequestsModal
        isOpen={isRequestsModalOpen}
        onClose={() => setIsRequestsModalOpen(false)}
        requests={requests}
        onAccept={handleAcceptRequest}
        onDecline={handleIgnoreRequest}
      />
      <Modal
        isOpen={savedUsersModalOpen}
        onClose={() => setSavedUsersModalOpen(false)}
        size="md"
        ariaLabel="Saved users"
        className={v2ModalClass}
        closeButtonClassName={v2CloseButtonClass}
      >
        <ModalHeader className={v2ModalHeaderClass}>
          <ModalTitle style={v2ModalTitleStyle}>Saved users</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="max-h-[60vh] overflow-y-auto">
            {savedUsersLoading ? (
              <ProfileSectionContentLoader />
            ) : savedUsers.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/50" style={kodeMono15}>
                No saved users yet.
              </p>
            ) : (
              <ul className="divide-y divide-white/10">
                {savedUsers.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/profile/${item.id}`}
                      className="flex items-center gap-3 py-3 transition-opacity hover:opacity-80"
                      onClick={() => setSavedUsersModalOpen(false)}
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#101319]">
                        {item.avatar_url ? (
                          <Image src={item.avatar_url} alt={item.twitter_name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-white/60">
                            {(item.twitter_name || "?").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="truncate text-sm font-medium text-white"
                          style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                        >
                          {item.twitter_name}
                        </p>
                        {item.city ? (
                          <p
                            className="truncate text-xs text-white/50"
                            style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                          >
                            {item.city}
                          </p>
                        ) : null}
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
        isOpen={suggestionsModalOpen}
        onClose={() => setSuggestionsModalOpen(false)}
        size="md"
        ariaLabel="User suggestions"
        className={v2ModalClass}
        closeButtonClassName={v2CloseButtonClass}
      >
        <ModalHeader className={v2ModalHeaderClass}>
          <ModalTitle style={v2ModalTitleStyle}>User suggestions</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="max-h-[60vh] overflow-y-auto">
            {suggestionsLoading ? (
              <ProfileSectionContentLoader />
            ) : suggestions.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/50" style={kodeMono15}>
                No suggestions yet.
              </p>
            ) : (
              <ul className="divide-y divide-white/10">
                {suggestions.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/profile/${item.id}`}
                      className="flex items-center gap-3 py-3 transition-opacity hover:opacity-80"
                      onClick={() => setSuggestionsModalOpen(false)}
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#101319]">
                        {item.avatar_url ? (
                          <Image src={item.avatar_url} alt={item.twitter_name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-white/60">
                            {(item.twitter_name || "?").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="truncate text-sm font-medium text-white"
                          style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                        >
                          {item.twitter_name}
                        </p>
                        {item.city ? (
                          <p
                            className="truncate text-xs text-white/50"
                            style={{ fontFamily: "var(--font-kode-mono), monospace" }}
                          >
                            {item.city}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ModalContent>
      </Modal>
      <div className="grid grid-cols-1 min-[830px]:grid-cols-[minmax(0,54fr)_minmax(0,46fr)] min-[1200px]:grid-cols-[minmax(0,599px)_minmax(0,601px)]">
        {/* Row 1 / Col 1: banner + avatar + actions + identity */}
        <div className="min-[830px]:col-start-1 min-[830px]:row-start-1 min-[830px]:border-r min-[830px]:border-r-white/10">
          <div className="relative h-[170px] bg-[#70767d] sm:h-[200px]">
            {bannerUrlLocal ? (
              <Image src={bannerUrlLocal} alt="Profile banner" fill className="object-cover" unoptimized />
            ) : null}

            {isOwnProfile ? (
              <>
                <input
                  ref={bannerFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleBannerPick(file);
                  }}
                />
                <button
                  type="button"
                  disabled={isBannerUploading}
                  onClick={() => bannerFileInputRef.current?.click()}
                  className={cn(
                    "absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black shadow-sm transition-opacity hover:opacity-90",
                    isBannerUploading && "cursor-wait opacity-70"
                  )}
                  aria-label="Change background"
                >
                  <Camera className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>

          <div className="relative px-6 pt-3 sm:px-10 min-[830px]:px-8 min-[1200px]:px-[45px]">
            <div className="profile-avatar-wrap absolute left-5">
              <div className="profile-avatar relative overflow-hidden rounded-full border-2 border-black bg-[#121212]">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={user.twitter_name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#1a1a1a] text-2xl font-bold text-white sm:text-4xl">
                    {(user.twitter_name || user.twitter_handle || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {actionButtons}

            <div className="profile-avatar-spacer">
              {identityBlock}
            </div>

            <style jsx>{`
              .profile-avatar-wrap {
                top: -48px;
              }
              .profile-avatar {
                width: 96px;
                height: 96px;
              }
              .profile-avatar-spacer {
                padding-top: 8px;
              }
              @media (min-width: 640px) {
                .profile-avatar-wrap {
                  top: -75px;
                }
                .profile-avatar {
                  width: 150px;
                  height: 150px;
                }
                .profile-avatar-spacer {
                  padding-top: 70px;
                }
              }
            `}</style>
          </div>
        </div>

        {/* Row 2 / Col 1: about */}
        <div className="border-b border-white/10 px-6 pb-6 pt-14 sm:px-10 min-[830px]:col-start-1 min-[830px]:row-start-2 min-[830px]:border-b-0 min-[830px]:border-r min-[830px]:border-r-white/10 min-[830px]:px-8 min-[1200px]:px-[45px]">
          {aboutSection}
        </div>

        {/* Row 3 / Col 1: experience */}
        <div className="border-b border-white/10 px-6 pb-10 pt-14 sm:px-10 min-[830px]:col-start-1 min-[830px]:row-start-3 min-[830px]:border-b-0 min-[830px]:border-r min-[830px]:border-r-white/10 min-[830px]:px-8 min-[1200px]:px-[45px]">
          {experienceSection}
        </div>

        {/* Row 1 / Col 2: mutual context + socials */}
        <div className="px-6 pb-6 pt-8 sm:px-10 min-[830px]:col-start-2 min-[830px]:row-start-1 min-[830px]:px-8 min-[830px]:pt-[61px] min-[1200px]:px-[50px]">
          <div className="mx-auto w-full max-w-[550px] min-[830px]:mx-0 space-y-14">
            <div className="hidden min-[830px]:block">
              {mutualContextCard}
            </div>
            {socialsSection}
          </div>
        </div>

        {/* Row 2 / Col 2: interested in */}
        <div className="px-6 pb-6 pt-14 sm:px-10 min-[830px]:col-start-2 min-[830px]:row-start-2 min-[830px]:px-8 min-[1200px]:px-[50px]">
          <div className="max-w-[384px]">{interestsSection}</div>
        </div>

        {/* Row 3 / Col 2: skills */}
        <div className="px-6 pb-10 pt-14 sm:px-10 min-[830px]:col-start-2 min-[830px]:row-start-3 min-[830px]:px-8 min-[1200px]:px-[50px]">
          {skillsSection}
        </div>

        <div className="px-6 pb-10 pt-4 sm:px-10 min-[830px]:hidden">
          {mutualContextCard}
        </div>
      </div>

      {isOwnProfile && isMounted && createPortal(
        <>
          {/* Backdrop: fades in/out */}
          <div
            role="presentation"
            aria-hidden={!isEditingProfile}
            onClick={() => {
              if (!isSaving) handleCancelEdit();
            }}
            style={{ zIndex: 1999 }}
            className={cn(
              "fixed inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-300 ease-out",
              isEditingProfile ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            )}
          />

          {/* Drawer: slides in from the right */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-hidden={!isEditingProfile}
            aria-label="Edit profile"
            style={{ zIndex: 2000 }}
            className={cn(
              "fixed inset-y-0 right-0 flex w-full max-w-[561px] transform flex-col bg-[#0F0F0F] shadow-[0_0_40px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out will-change-transform",
              isEditingProfile ? "translate-x-0" : "translate-x-full"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="uppercase text-white" style={editDrawerTitleStyle}>
                Edit profile
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (!isSaving) handleCancelEdit();
                }}
                disabled={isSaving}
                className="flex items-center justify-center transition-colors disabled:opacity-50"
                style={{
                  width: 33,
                  height: 33,
                  background: "#272727",
                  border: "none",
                  borderRadius: 0,
                  color: "#808080",
                  marginTop: -5,
                }}
                aria-label="Close"
              >
                <X className="h-6 w-6" strokeWidth={1.5} />
              </button>
            </div>

            {/* Divider: 67px from top of drawer */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 67,
                left: 0,
                right: 0,
                height: 1,
                background: "#323232",
              }}
            />

            {/* Tabs */}
            <div
              className="flex items-center pb-4"
              style={{ paddingLeft: 6, gap: 15, paddingTop: 20 }}
            >
              {(["personal", "professional", "social"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveEditTab(tab)}
                  style={{
                    ...fieldLabelStyle,
                    fontSize: 16,
                    lineHeight: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "6px 8px",
                    borderRadius: 4,
                    background: activeEditTab === tab ? "#232323" : "transparent",
                    color: activeEditTab === tab ? "#ffffff" : "rgba(255,255,255,0.4)",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.2s, color 0.2s",
                    flexShrink: 0,
                    textTransform: "uppercase",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6">
              {detailsError && (
                <p className="mb-3 text-xs text-amber-500" style={interBody12}>
                  {detailsError}
                </p>
              )}

              {activeEditTab === "personal" && (
                <div className="space-y-5 pt-4">
                  {/* Avatar preview */}
                  <div className="relative inline-block">
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleAvatarPick(file);
                      }}
                    />
                    <button
                      type="button"
                      disabled={detailsLoading || isAvatarUploading}
                      onClick={() => avatarFileInputRef.current?.click()}
                      className={cn(
                        "relative h-[100px] w-[100px] overflow-hidden rounded-[6px] border border-white/10 bg-[#1a1a1a] transition-opacity",
                        (detailsLoading || isAvatarUploading) && "cursor-wait opacity-70"
                      )}
                      aria-label="Change avatar"
                    >
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt={user.twitter_name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                          {(user.twitter_name || user.twitter_handle || "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div
                        className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-[4px] border border-white/10 bg-[#0F0F0F] text-white/70"
                        aria-hidden
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  </div>

                  {/* Display name + Username */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block uppercase text-[#adaaaa]" style={fieldLabelStyle}>
                        Display name
                      </label>
                      <input
                        className={inputClass}
                        style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 700, fontSize: 15, lineHeight: "normal", letterSpacing: 0 }}
                        value={displayNameDraft}
                        onChange={(e) => {
                          const next = e.target.value;
                          setDisplayNameDraft(next.length > 15 ? next.slice(0, 15) : next);
                        }}
                        maxLength={15}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block uppercase text-[#adaaaa]" style={fieldLabelStyle}>
                        Username
                      </label>
                      <input
                        className={inputClass}
                        style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 700, fontSize: 15, lineHeight: "normal", letterSpacing: 0 }}
                        value={`@${user.twitter_handle ?? ""}`}
                        disabled
                      />
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="mb-2 block uppercase text-[#adaaaa]" style={fieldLabelStyle}>
                      Role
                    </label>
                    <SearchableSingleSelect
                      label=""
                      placeholder="Choose role"
                      value={roleDraft}
                      onChange={(nextValue) => setRoleDraft(nextValue as UserRole | "")}
                      options={roleSelectOptions}
                      searchPlaceholder="find role"
                    />
                  </div>

                  {/* Country + City */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block uppercase text-[#adaaaa]" style={fieldLabelStyle}>
                        Country
                      </label>
                      <SearchableSingleSelect
                        label=""
                        placeholder="Choose country"
                        value={countryCodeDraft}
                        onChange={setCountryCodeDraft}
                        options={countrySelectOptions}
                        searchPlaceholder="find your country"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block uppercase text-[#adaaaa]" style={fieldLabelStyle}>
                        City
                      </label>
                      <input
                        className={inputClass}
                        style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 700, fontSize: 15, lineHeight: "normal", letterSpacing: 0 }}
                        value={cityDraft}
                        onChange={(e) => setCityDraft(e.target.value)}
                        placeholder="City"
                      />
                    </div>
                  </div>

                  {/* About you */}
                  <div>
                    <label className="mb-2 block uppercase text-[#adaaaa]" style={fieldLabelStyle}>
                      About you
                    </label>
                    <div className="relative">
                      <textarea
                        className={cn(textareaClass, "min-h-[150px] text-[16px] leading-[24px]")}
                        style={{ ...sectionBodyStyle, fontSize: 16, lineHeight: "24px", fontWeight: 500 }}
                        value={aboutDraft}
                        onChange={(e) => {
                          const next = e.target.value;
                          setAboutDraft(next.length > ABOUT_MAX ? next.slice(0, ABOUT_MAX) : next);
                        }}
                        placeholder="Tell others about yourself..."
                        maxLength={ABOUT_MAX}
                        rows={6}
                        disabled={detailsLoading}
                      />
                      <div className="pointer-events-none absolute bottom-2 right-2 text-[11px] text-white/45">
                        {aboutDraft.length}/{ABOUT_MAX}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeEditTab === "professional" && (
                <div className="space-y-6 pt-4">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
                        Interested in
                      </label>
                      <span className="text-[11px] text-white/60">
                        {interestSlugsDraft.length}/{MAX_INTERESTS}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                      {editableInterestOptions.map((interest) => {
                        const isSelected = interestSlugsDraft.includes(interest.slug);
                        const limitReached = !isSelected && interestSlugsDraft.length >= MAX_INTERESTS;
                        return (
                          <button
                            key={interest.slug}
                            type="button"
                            className={cn(
                              "group flex w-full items-center justify-between gap-3 text-left transition-opacity",
                              limitReached && "cursor-not-allowed opacity-45"
                            )}
                            aria-pressed={isSelected}
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
                            <span className="text-white" style={kodeMono14Bold}>
                              {interest.name}
                            </span>
                            <span
                              aria-hidden="true"
                              className={cn(
                                "grid h-[13px] w-[13px] place-items-center rounded-[2px] border",
                                "border-[#313131] bg-[#0F0F0F]",
                                !limitReached && "group-hover:border-white/40"
                              )}
                              style={{ borderWidth: 1 }}
                            >
                              {isSelected ? <span className="h-[7px] w-[7px] rounded-[1px] bg-white" /> : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p
                      className="mt-2 text-[11px] text-white/50"
                      style={{ fontFamily: "var(--font-display), sans-serif" }}
                    >
                      You can choose up to {MAX_INTERESTS} interests.
                    </p>
                  </div>

                  <div>
                    <label className="mb-3 block uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
                      Skills
                    </label>
                    <SkillTagPicker
                      categories={skillCategories}
                      items={skillDictionary}
                      selectedSlugs={skillSlugsDraft}
                      onChange={setSkillSlugsDraft}
                      maxSelected={MAX_PROFILE_SKILLS}
                      searchPlaceholder="Find skills"
                      variant="toggles"
                      disabled={detailsLoading}
                    />
                  </div>

                  <div>
                    <label className="mb-3 block uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
                      Experience
                    </label>
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
                            maxLength={25}
                            style={spaceGrotesk14Semibold}
                            onChange={(e) =>
                              setExpDrafts((prev) =>
                                prev.map((r) =>
                                  r.key === row.key ? { ...r, title: e.target.value.slice(0, 25) } : r
                                )
                              )
                            }
                          />
                          <input
                            className={inputClass}
                            placeholder="Company / project"
                            value={row.company}
                            maxLength={25}
                            style={spaceGrotesk14Semibold}
                            onChange={(e) =>
                              setExpDrafts((prev) =>
                                prev.map((r) =>
                                  r.key === row.key ? { ...r, company: e.target.value.slice(0, 25) } : r
                                )
                              )
                            }
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="mb-1 block text-xs text-[var(--color-text-muted)]" style={{ fontFamily: "var(--font-display), sans-serif" }}>
                                Start
                              </label>
                              <input
                                type="month"
                                className={inputClass}
                                value={row.startDate}
                                style={spaceGrotesk14Semibold}
                                onChange={(e) =>
                                  setExpDrafts((prev) =>
                                    prev.map((r) => (r.key === row.key ? { ...r, startDate: e.target.value } : r))
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-[var(--color-text-muted)]" style={{ fontFamily: "var(--font-display), sans-serif" }}>
                                End (blank = present)
                              </label>
                              <input
                                type="month"
                                className={inputClass}
                                value={row.endDate}
                                style={spaceGrotesk14Semibold}
                                onChange={(e) =>
                                  setExpDrafts((prev) =>
                                    prev.map((r) => (r.key === row.key ? { ...r, endDate: e.target.value } : r))
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <textarea
                              className={textareaClass + " min-h-[72px]"}
                              placeholder="Description (optional)"
                              rows={2}
                              maxLength={500}
                              value={row.description}
                              onChange={(e) =>
                                setExpDrafts((prev) =>
                                  prev.map((r) => (r.key === row.key ? { ...r, description: e.target.value } : r))
                                )
                              }
                            />
                            <p className="mt-1 text-right text-xs text-[#70767d]">{row.description.length}/500</p>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addExperienceRow}
                        className={cn(
                          figmaCancelButtonCompactClass,
                          "h-[44px] w-[173px] rounded-[5px] border-white/35 bg-white/[0.12] hover:bg-white/[0.18]"
                        )}
                        style={{ ...kodeMono15, fontWeight: 700 }}
                      >
                        Add experience
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeEditTab === "social" && (
                <div className="pt-4">
                  <div className="mb-8 flex items-center justify-between gap-4">
                    <div className="flex min-h-[45px] items-center">
                      <h2 className="uppercase text-white" style={editDrawerTitleStyle}>
                        Social links
                      </h2>
                    </div>
                    <div className="relative shrink-0" ref={socialAddMenuRef}>
                      <button
                        type="button"
                        onClick={() => setSocialAddMenuOpen((open) => !open)}
                        disabled={detailsLoading || socialPlatformsAvailableToAdd.length === 0}
                        className="inline-flex h-[45px] w-[100px] shrink-0 items-center justify-center gap-1.5 rounded-[7px] border-0 bg-white px-2 text-black transition-opacity hover:bg-white/90 disabled:opacity-50"
                        style={{
                          fontFamily: "var(--font-kode-mono), monospace",
                          fontWeight: 600,
                          fontSize: 17,
                          letterSpacing: "0.12em",
                          lineHeight: 1,
                        }}
                        aria-expanded={socialAddMenuOpen}
                        aria-haspopup="menu"
                      >
                        ADD
                        <ChevronDown
                          className={cn(
                            "h-[22px] w-[22px] shrink-0 text-black transition-transform",
                            socialAddMenuOpen && "rotate-180"
                          )}
                          aria-hidden
                          strokeWidth={2.5}
                        />
                      </button>
                      {socialAddMenuOpen ? (
                        <div
                          className="absolute right-0 z-20 mt-2 min-w-[200px] overflow-hidden rounded-[6px] border border-white/10 bg-[#1a1a1a] py-1 text-left shadow-lg"
                          role="menu"
                        >
                          {socialPlatformsAvailableToAdd.length === 0 ? (
                            <p
                              className="px-3 py-2 text-[11px] text-white/45"
                              style={{ fontFamily: "var(--font-display), sans-serif" }}
                            >
                              All networks added.
                            </p>
                          ) : (
                            socialPlatformsAvailableToAdd.map((platform) => (
                              <button
                                key={platform}
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center px-3 py-2.5 text-left text-[13px] text-white transition-colors hover:bg-white/10"
                                style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 500 }}
                                onClick={() => {
                                  setActiveSocialOrder((prev) => (prev.includes(platform) ? prev : [...prev, platform]));
                                  setSocialAddMenuOpen(false);
                                }}
                              >
                                {SOCIAL_PLATFORM_CONFIG[platform].menuLabel}
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-8">
                    {activeSocialOrder.length === 0 ? (
                      <p className="text-sm text-white/45" style={{ fontFamily: "var(--font-display), sans-serif" }}>
                        Use ADD to choose a network.
                      </p>
                    ) : (
                      activeSocialOrder.map((platform) => (
                        <div key={platform}>
                          <label
                            className="flex min-h-[32px] items-center uppercase text-white"
                            style={socialLinksFieldLabelStyle}
                          >
                            {SOCIAL_PLATFORM_CONFIG[platform].fieldLabel}
                          </label>
                          <div className="mt-2 flex items-stretch gap-2">
                            <div className="relative min-w-0 flex-1">
                              <SocialLinkPlatformIcon platform={platform} />
                              <input
                                type="text"
                                autoComplete="off"
                                placeholder={SOCIAL_PLATFORM_CONFIG[platform].placeholder}
                                value={socialDrafts[platform]}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setSocialDrafts((prev) => ({
                                    ...prev,
                                    [platform]:
                                      platform === "telegram" || platform === "twitter"
                                        ? v.replace(/^@+/, "")
                                        : v,
                                  }));
                                }}
                                disabled={detailsLoading}
                                className={cn(inputClass, "pl-10")}
                                style={{
                                  fontFamily: "var(--font-display), sans-serif",
                                  fontWeight: 700,
                                  fontSize: 15,
                                  lineHeight: "normal",
                                  letterSpacing: 0,
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              disabled={detailsLoading}
                              onClick={() => {
                                setActiveSocialOrder((prev) => prev.filter((p) => p !== platform));
                                setSocialDrafts((prev) => ({ ...prev, [platform]: "" }));
                              }}
                              className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[5px] border-0 bg-[#272727] text-white transition-colors hover:bg-[#323232] disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={`Remove ${SOCIAL_PLATFORM_CONFIG[platform].menuLabel}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-6 py-4">
              {saveMessage && (
                <p className="mb-3 text-right text-sm text-green-500" style={interBody12}>
                  {saveMessage}
                </p>
              )}
              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(figmaCancelButtonCompactClass, "h-[44px] w-[173px] rounded-[5px]")}
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  style={{ ...kodeMono15, fontWeight: 700 }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className={cn(figmaConnectButtonCompactClass, "h-[44px] w-[173px] rounded-[5px]")}
                  onClick={handleSave}
                  disabled={isSaving || detailsLoading}
                  style={{ ...kodeMono15, fontWeight: 700 }}
                >
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
                  Save changes
                </Button>
              </div>
            </div>
          </aside>
        </>,
        document.body
      )}

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
                      href={`/profile/${item.id}`}
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
                      href={`/profile/${item.id}`}
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
        variant="compact"
        title="Log in or Sign up to continue"
      />

      {isAvatarCropOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[2000] flex items-start justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.7)", paddingTop: 80 }}
              onClick={handleCloseAvatarCrop}
            >
              <div
                className="relative flex flex-col mx-4 overflow-hidden"
                style={{
                  width: 601,
                  maxWidth: "100%",
                  height: 576,
                  maxHeight: "90vh",
                  backgroundColor: "#0B0B0B",
                  border: "none",
                  borderRadius: 4,
                }}
                onClick={(ev) => ev.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Crop avatar"
              >
                <h2
                  className="absolute left-0 right-0 text-center text-white uppercase"
                  style={{
                    top: 31,
                    fontFamily: "var(--font-kode-mono), monospace",
                    fontWeight: 600,
                    fontSize: 25,
                    letterSpacing: "2px",
                    lineHeight: 1,
                  }}
                >
                  Crop avatar
                </h2>

                <div
                  className="absolute left-0 right-0"
                  style={{
                    top: 31 + 25 + 19,
                    height: 1,
                    backgroundColor: "#323232",
                  }}
                />

                <button
                  type="button"
                  onClick={handleCloseAvatarCrop}
                  disabled={isAvatarUploading}
                  className="absolute flex items-center justify-center transition-opacity hover:opacity-70 disabled:opacity-50"
                  style={{
                    top: 23,
                    right: 24,
                    width: 33,
                    height: 33,
                    backgroundColor: "#272727",
                    borderRadius: 4,
                  }}
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M1 1L13 13M13 1L1 13"
                      stroke="#808080"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>

                <div className="mt-[90px] px-8 pb-8">
                  <div>
                    <style>{`
                      .sp-crop-range{ -webkit-appearance:none; appearance:none; background:transparent; }
                      .sp-crop-range:focus{ outline:none; }
                      .sp-crop-range::-webkit-slider-runnable-track{ height:2px; background:#FFFFFF; border-radius:9999px; }
                      .sp-crop-range::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:14px; height:14px; border-radius:9999px; background:#FFFFFF; margin-top:-6px; box-shadow:0 0 0 2px rgba(11,11,11,0.9); }
                      .sp-crop-range::-moz-range-track{ height:2px; background:#FFFFFF; border-radius:9999px; }
                      .sp-crop-range::-moz-range-thumb{ width:14px; height:14px; border:0; border-radius:9999px; background:#FFFFFF; box-shadow:0 0 0 2px rgba(11,11,11,0.9); }
                    `}</style>
                    <div
                      className="relative w-full overflow-hidden rounded-[4px]"
                      style={{ height: 360, border: "none", backgroundColor: "#000" }}
                    >
                      {avatarCropSrc ? (
                        <Cropper
                          image={avatarCropSrc}
                          crop={avatarCrop}
                          zoom={avatarZoom}
                          aspect={1}
                          cropShape="round"
                          showGrid={false}
                          onCropChange={setAvatarCrop}
                          onZoomChange={setAvatarZoom}
                          onCropComplete={(_, croppedAreaPixels) => setAvatarCroppedAreaPixels(croppedAreaPixels)}
                        />
                      ) : null}
                    </div>

                    <div className="absolute left-8 right-8 flex items-center gap-3" style={{ bottom: 24 + 49 + 15 }}>
                      <span
                        className="text-white/60"
                        style={{
                          fontFamily: "var(--font-kode-mono), monospace",
                          fontWeight: 700,
                          fontSize: 20,
                          lineHeight: 1,
                        }}
                      >
                        Zoom
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.01}
                        value={avatarZoom}
                        onChange={(e) => setAvatarZoom(Number(e.target.value))}
                        className="sp-crop-range w-full"
                      />
                    </div>

                    <div className="absolute left-0 right-0" style={{ bottom: 24, height: 49 }}>
                      <button
                        type="button"
                        onClick={handleCloseAvatarCrop}
                        disabled={isAvatarUploading}
                        className={cn(
                          "absolute left-[76px] inline-flex items-center justify-center transition-[background-color,transform,opacity] duration-150",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0B]",
                          "hover:bg-[#3A3A3A] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_10px_30px_rgba(0,0,0,0.65)] active:scale-[0.99] disabled:opacity-50"
                        )}
                        style={{
                          width: 194,
                          height: 49,
                          backgroundColor: "#1A1A1A",
                          borderRadius: 7,
                          fontFamily: "var(--font-kode-mono), monospace",
                          fontWeight: 700,
                          fontSize: 20,
                          color: "#FFFFFF",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmAvatarCrop}
                        disabled={isAvatarUploading || !avatarCroppedAreaPixels}
                        className={cn(
                          "absolute right-[76px] inline-flex items-center justify-center transition-[background-color,transform,opacity] duration-150",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0B]",
                          "hover:bg-[#D6D6D6] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_10px_30px_rgba(0,0,0,0.65)] active:scale-[0.99] disabled:opacity-50"
                        )}
                        style={{
                          width: 194,
                          height: 49,
                          backgroundColor: "#FFFFFF",
                          borderRadius: 7,
                          fontFamily: "var(--font-kode-mono), monospace",
                          fontWeight: 700,
                          fontSize: 20,
                          color: "#000000",
                        }}
                      >
                        {isAvatarUploading ? "Uploading…" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {isBannerCropOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[2000] flex items-start justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.7)", paddingTop: 80 }}
              onClick={handleCloseBannerCrop}
            >
              <div
                className="relative flex flex-col mx-4 overflow-hidden"
                style={{
                  width: 601,
                  maxWidth: "100%",
                  height: 576,
                  maxHeight: "90vh",
                  backgroundColor: "#0B0B0B",
                  border: "none",
                  borderRadius: 4,
                }}
                onClick={(ev) => ev.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Crop banner"
              >
                <h2
                  className="absolute left-0 right-0 text-center text-white uppercase"
                  style={{
                    top: 31,
                    fontFamily: "var(--font-kode-mono), monospace",
                    fontWeight: 600,
                    fontSize: 25,
                    letterSpacing: "2px",
                    lineHeight: 1,
                  }}
                >
                  Crop background
                </h2>

                <div
                  className="absolute left-0 right-0"
                  style={{
                    top: 31 + 25 + 19,
                    height: 1,
                    backgroundColor: "#323232",
                  }}
                />

                <button
                  type="button"
                  onClick={handleCloseBannerCrop}
                  disabled={isBannerUploading}
                  className="absolute flex items-center justify-center transition-opacity hover:opacity-70 disabled:opacity-50"
                  style={{
                    top: 23,
                    right: 24,
                    width: 33,
                    height: 33,
                    backgroundColor: "#272727",
                    borderRadius: 4,
                  }}
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M1 1L13 13M13 1L1 13"
                      stroke="#808080"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>

                <div className="mt-[90px] px-8 pb-8">
                  <div>
                    <style>{`
                      .sp-crop-range{ -webkit-appearance:none; appearance:none; background:transparent; }
                      .sp-crop-range:focus{ outline:none; }
                      .sp-crop-range::-webkit-slider-runnable-track{ height:2px; background:#FFFFFF; border-radius:9999px; }
                      .sp-crop-range::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:14px; height:14px; border-radius:9999px; background:#FFFFFF; margin-top:-6px; box-shadow:0 0 0 2px rgba(11,11,11,0.9); }
                      .sp-crop-range::-moz-range-track{ height:2px; background:#FFFFFF; border-radius:9999px; }
                      .sp-crop-range::-moz-range-thumb{ width:14px; height:14px; border:0; border-radius:9999px; background:#FFFFFF; box-shadow:0 0 0 2px rgba(11,11,11,0.9); }
                    `}</style>
                    <div
                      className="relative w-full overflow-hidden rounded-[4px]"
                      style={{ height: 280, border: "none", backgroundColor: "#000" }}
                    >
                      {bannerCropSrc ? (
                        <Cropper
                          image={bannerCropSrc}
                          crop={bannerCrop}
                          zoom={bannerZoom}
                          aspect={3 / 1}
                          cropShape="rect"
                          showGrid={false}
                          onCropChange={setBannerCrop}
                          onZoomChange={setBannerZoom}
                          onCropComplete={(_, croppedAreaPixels) => setBannerCroppedAreaPixels(croppedAreaPixels)}
                        />
                      ) : null}
                    </div>

                    <div className="mt-[35px] flex items-center gap-3">
                      <span
                        className="text-white/60"
                        style={{
                          fontFamily: "var(--font-kode-mono), monospace",
                          fontWeight: 700,
                          fontSize: 20,
                          lineHeight: 1,
                        }}
                      >
                        Zoom
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.01}
                        value={bannerZoom}
                        onChange={(e) => setBannerZoom(Number(e.target.value))}
                        className="sp-crop-range w-full"
                      />
                    </div>

                    <div className="absolute left-0 right-0" style={{ bottom: 24, height: 49 }}>
                      <button
                        type="button"
                        onClick={handleCloseBannerCrop}
                        disabled={isBannerUploading}
                        className={cn(
                          "absolute left-[76px] inline-flex items-center justify-center transition-[background-color,transform,opacity] duration-150",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0B]",
                          "hover:bg-[#3A3A3A] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_10px_30px_rgba(0,0,0,0.65)] active:scale-[0.99] disabled:opacity-50"
                        )}
                        style={{
                          width: 194,
                          height: 49,
                          backgroundColor: "#1A1A1A",
                          borderRadius: 7,
                          fontFamily: "var(--font-kode-mono), monospace",
                          fontWeight: 700,
                          fontSize: 20,
                          color: "#FFFFFF",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmBannerCrop}
                        disabled={isBannerUploading || !bannerCroppedAreaPixels}
                        className={cn(
                          "absolute right-[76px] inline-flex items-center justify-center transition-[background-color,transform,opacity] duration-150",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0B]",
                          "hover:bg-[#D6D6D6] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_10px_30px_rgba(0,0,0,0.65)] active:scale-[0.99] disabled:opacity-50"
                        )}
                        style={{
                          width: 194,
                          height: 49,
                          backgroundColor: "#FFFFFF",
                          borderRadius: 7,
                          fontFamily: "var(--font-kode-mono), monospace",
                          fontWeight: 700,
                          fontSize: 20,
                          color: "#000000",
                        }}
                      >
                        {isBannerUploading ? "Uploading…" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {isMounted && isAllExperienceModalOpen
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="All experience"
              className="fixed inset-0 z-[1100] flex items-start justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.7)", paddingTop: 80 }}
              onClick={() => setIsAllExperienceModalOpen(false)}
            >
              <div
                className="relative flex flex-col mx-4 overflow-hidden"
                style={{
                  width: 601,
                  maxWidth: "100%",
                  height: 1085,
                  maxHeight: "90vh",
                  backgroundColor: "#0B0B0B",
                  border: "1px solid #5E5E5E",
                  borderRadius: 4,
                }}
                onClick={(ev) => ev.stopPropagation()}
              >
                <h2
                  className="absolute left-0 right-0 text-center text-white uppercase"
                  style={{
                    top: 31,
                    fontFamily: "var(--font-kode-mono), monospace",
                    fontWeight: 600,
                    fontSize: 25,
                    letterSpacing: "2px",
                    lineHeight: 1,
                  }}
                >
                  Experience
                </h2>

                <button
                  type="button"
                  onClick={() => setIsAllExperienceModalOpen(false)}
                  className="absolute flex items-center justify-center transition-opacity hover:opacity-70"
                  style={{
                    top: 23,
                    right: 24,
                    width: 33,
                    height: 33,
                    backgroundColor: "#272727",
                    borderRadius: 4,
                  }}
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1L13 13M13 1L1 13" stroke="#808080" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>

                <style>{`.exp-modal-scroll::-webkit-scrollbar{width:5px}.exp-modal-scroll::-webkit-scrollbar-track{background:transparent}.exp-modal-scroll::-webkit-scrollbar-thumb{background:#4a4a4a;border-radius:9999px}`}</style>
                <div className="exp-modal-scroll overflow-y-auto mt-[90px] px-10 pb-10">
                  <ul className="flex flex-col gap-8">
                    {experienceList.map((e, index) => (
                      <li key={e.id} className="flex gap-0">
                        <div className="relative flex flex-col items-center" style={{ width: 24, minWidth: 24 }}>
                          <span
                            className={cn(
                              "shrink-0 rounded-full",
                              index === 0 ? "bg-[#00ffa3]" : "bg-[#484847]"
                            )}
                            style={{ width: 16, height: 16, marginTop: 6 }}
                          />
                          {index !== experienceList.length - 1 && (
                            <div className="w-px flex-1" style={{ backgroundColor: "rgba(72,72,71,0.5)" }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pl-5">
                          <p
                            className={cn(index === 0 ? "text-[#f9f9f9]" : "text-[#6b6b6b]")}
                            style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 700, fontSize: 20, lineHeight: "30px" }}
                          >
                            {e.company ? `${e.title} at ${e.company}` : e.title}
                          </p>
                          {(e.startDate || e.endDate) && (
                            <p
                              className={cn("mt-1 uppercase", index === 0 ? "text-[#adaaaa]" : "text-[#4a4a4a]")}
                              style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 400, fontSize: 15, letterSpacing: "1px" }}
                            >
                              {fmtMonthYear(e.startDate) || "—"} — {fmtMonthYear(e.endDate) || "Present"}
                            </p>
                          )}
                          {e.description && (
                            <p
                              className={cn("mt-2 break-words", index === 0 ? "text-[#adaaaa]" : "text-[#4a4a4a]")}
                              style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 300, fontSize: 20, lineHeight: "30px", overflowWrap: "break-word" }}
                            >
                              {e.description}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
