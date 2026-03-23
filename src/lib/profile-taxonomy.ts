import type { UserRole } from "@/types";

export interface RoleOption {
  value: UserRole;
  label: string;
}

export interface InterestDefinition {
  slug: string;
  name: string;
}

export const USER_ROLE_OPTIONS: RoleOption[] = [
  { value: "marketing_or_bd", label: "Marketing or BD" },
  { value: "non_tech_founder", label: "Non-tech Founder" },
  { value: "tech_founder", label: "Tech Founder" },
  { value: "designer_ui_ux", label: "Designer (UI/UX)" },
  { value: "graphics_designer", label: "Graphics Designer" },
  { value: "vc", label: "VC" },
  { value: "angel_investor", label: "Angel Investor" },
  { value: "artist", label: "Artist" },
  { value: "influencer", label: "Influencer" },
  { value: "developer", label: "Developer" },
  { value: "validator", label: "Validator" },
  { value: "other", label: "Other" },
];

export const USER_ROLE_VALUES: UserRole[] = USER_ROLE_OPTIONS.map((option) => option.value);

export const USER_ROLE_LABELS: Record<UserRole, string> = USER_ROLE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {} as Record<UserRole, string>
);

export const INTEREST_DEFINITIONS: InterestDefinition[] = [
  { slug: "defi", name: "DeFi" },
  { slug: "art", name: "Art" },
  { slug: "infrastructure", name: "Infrastructure" },
  { slug: "digital_collectibles", name: "Digital Collectibles" },
  { slug: "gaming", name: "Gaming" },
  { slug: "payments", name: "Payments" },
  { slug: "depin", name: "DePin" },
  { slug: "developer_tooling", name: "Developer tooling" },
  { slug: "social", name: "Social" },
  { slug: "security", name: "Security" },
  { slug: "other", name: "Other" },
];

export const INTEREST_SLUGS = new Set(INTEREST_DEFINITIONS.map((item) => item.slug));
