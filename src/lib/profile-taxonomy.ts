import type { UserRole } from "@/types";

export interface RoleOption {
  value: UserRole;
  label: string;
}

export interface InterestDefinition {
  slug: string;
  name: string;
}

export interface SkillCategoryDefinition {
  slug: string;
  name: string;
  sortOrder: number;
}

export interface SkillDefinition {
  slug: string;
  label: string;
  category: string;
  sortOrder: number;
}

export const MAX_PROFILE_SKILLS = 5;

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

const SKILL_GROUPS: Array<{ categorySlug: string; categoryName: string; skills: string[] }> = [
  {
    categorySlug: "engineering_tech",
    categoryName: "Engineering / Tech",
    skills: [
      "Frontend Development",
      "Backend Development",
      "Full-Stack Development",
      "Mobile Development",
      "Smart Contract Development",
      "Blockchain Development",
      "Solana Development",
      "Ethereum Development",
      "dApp Development",
      "DevOps",
      "Infrastructure",
      "QA / Testing",
      "Security Engineering",
      "Data Engineering",
      "AI / ML Engineering",
      "Product Engineering",
      "UI Engineering",
      "API Development",
      "Systems Architecture",
    ],
  },
  {
    categorySlug: "design",
    categoryName: "Design",
    skills: [
      "Product Design",
      "UI Design",
      "UX Design",
      "Graphic Design",
      "Brand Design",
      "Motion Design",
      "3D Design",
      "Illustration",
      "Web Design",
      "Design Systems",
      "Prototyping",
      "Presentation Design",
    ],
  },
  {
    categorySlug: "product",
    categoryName: "Product",
    skills: [
      "Product Management",
      "Product Strategy",
      "Growth Product Management",
      "User Research",
      "Analytics",
      "A/B Testing",
      "Roadmapping",
      "Product Operations",
      "MVP Development",
      "Go-to-Market Strategy",
    ],
  },
  {
    categorySlug: "marketing",
    categoryName: "Marketing",
    skills: [
      "Content Marketing",
      "Social Media Marketing",
      "Growth Marketing",
      "Performance Marketing",
      "Brand Marketing",
      "Community Marketing",
      "Influencer Marketing",
      "KOL Marketing",
      "Email Marketing",
      "SEO",
      "Copywriting",
      "Storytelling",
      "Memes / Viral Content",
      "Marketing Strategy",
    ],
  },
  {
    categorySlug: "sales_bd",
    categoryName: "Sales / BD",
    skills: [
      "Business Development",
      "Partnerships",
      "Sponsorships",
      "Sales",
      "Lead Generation",
      "Account Management",
      "B2B Sales",
      "Negotiation",
      "Fundraising",
      "Investor Relations",
      "Deal Flow",
      "Ecosystem Partnerships",
    ],
  },
  {
    categorySlug: "operations",
    categoryName: "Operations",
    skills: [
      "Operations",
      "Project Management",
      "Program Management",
      "Event Operations",
      "Community Operations",
      "People Operations",
      "Recruiting",
      "Customer Support",
      "Customer Success",
    ],
  },
  {
    categorySlug: "founder_business",
    categoryName: "Founder / Business",
    skills: [
      "Entrepreneurship",
      "Startup Strategy",
      "Team Leadership",
      "Hiring",
      "Pitching",
      "Market Research",
      "Business Strategy",
      "Revenue Operations",
      "Monetization",
      "Business Analysis",
    ],
  },
  {
    categorySlug: "community",
    categoryName: "Community",
    skills: [
      "Community Building",
      "Community Management",
      "Moderation",
      "Ambassador Programs",
      "Developer Relations",
      "Advocacy",
      "Public Speaking",
      "Event Hosting",
      "Event Networking",
      "Conference Speaking",
    ],
  },
  {
    categorySlug: "content_media",
    categoryName: "Content / Media",
    skills: [
      "Writing",
      "Technical Writing",
      "Editing",
      "Video Editing",
      "Podcasting",
      "Streaming",
      "Scriptwriting",
      "Journalism",
      "Newsletter Writing",
      "Documentation",
      "Crypto Content",
    ],
  },
  {
    categorySlug: "finance_web3",
    categoryName: "Finance / Web3 Native",
    skills: [
      "Tokenomics",
      "DeFi",
      "Trading",
      "Onchain Analytics",
      "Research",
      "DAO Operations",
      "Governance",
      "Treasury Management",
      "NFT Strategy",
      "NFT Growth",
      "Crypto Marketing",
      "Web3 Strategy",
      "Token Launch Strategy",
      "DeFi Research",
      "Onchain Research",
      "DAO Governance",
    ],
  },
  {
    categorySlug: "legal_business_support",
    categoryName: "Legal / Business Support",
    skills: [
      "Legal Operations",
      "Compliance",
      "Policy Writing",
      "Risk Management",
    ],
  },
  {
    categorySlug: "web3_ecosystem",
    categoryName: "Web3 Ecosystem",
    skills: [
      "Solana Ecosystem",
      "Ecosystem Growth",
      "Web3 Business Development",
      "Web3 Recruiting",
      "Crypto Partnerships",
      "Ecosystem Partnerships",
    ],
  },
];

function slugifySkillLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export const SKILL_CATEGORIES: SkillCategoryDefinition[] = SKILL_GROUPS.map((group, index) => ({
  slug: group.categorySlug,
  name: group.categoryName,
  sortOrder: index,
}));

const rawSkillDefinitions: SkillDefinition[] = SKILL_GROUPS.flatMap((group) =>
  group.skills.map((label, skillIndex) => ({
    slug: slugifySkillLabel(label),
    label,
    category: group.categorySlug,
    sortOrder: skillIndex,
  }))
);

const seenSkillSlugs = new Set<string>();
export const SKILL_DEFINITIONS: SkillDefinition[] = rawSkillDefinitions.filter((skill) => {
  if (seenSkillSlugs.has(skill.slug)) {
    return false;
  }
  seenSkillSlugs.add(skill.slug);
  return true;
});

const SKILL_ALIAS_ENTRIES: Array<{ alias: string; slug: string }> = [
  { alias: "full stack development", slug: "full_stack_development" },
  { alias: "fullstack development", slug: "full_stack_development" },
  { alias: "full stack", slug: "full_stack_development" },
  { alias: "fullstack", slug: "full_stack_development" },
  { alias: "dev ops", slug: "devops" },
  { alias: "qa", slug: "qa_testing" },
  { alias: "qa testing", slug: "qa_testing" },
  { alias: "quality assurance", slug: "qa_testing" },
  { alias: "ui ux design", slug: "ux_design" },
  { alias: "ui ux", slug: "ux_design" },
  { alias: "ux ui design", slug: "ux_design" },
  { alias: "product ops", slug: "product_operations" },
  { alias: "go to market strategy", slug: "go_to_market_strategy" },
  { alias: "go to market", slug: "go_to_market_strategy" },
  { alias: "kol", slug: "kol_marketing" },
  { alias: "memes", slug: "memes_viral_content" },
  { alias: "viral content", slug: "memes_viral_content" },
  { alias: "business dev", slug: "business_development" },
  { alias: "biz dev", slug: "business_development" },
  { alias: "b2b", slug: "b2b_sales" },
  { alias: "customer service", slug: "customer_support" },
  { alias: "user research ux", slug: "user_research" },
  { alias: "public speaking events", slug: "public_speaking" },
  { alias: "dao governance", slug: "dao_governance" },
  { alias: "on chain analytics", slug: "onchain_analytics" },
  { alias: "on chain research", slug: "onchain_research" },
  { alias: "web3 bd", slug: "web3_business_development" },
  { alias: "web3 business dev", slug: "web3_business_development" },
  { alias: "web3 recruiting", slug: "web3_recruiting" },
  { alias: "crypto partnerships", slug: "crypto_partnerships" },
  { alias: "ecosystem partnership", slug: "ecosystem_partnerships" },
];

function normalizeSkillLookupKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[/'’`]/g, " ")
    .replace(/-/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeSkillSlugCandidate(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

const SKILL_DEFINITION_BY_SLUG_MAP = new Map<string, SkillDefinition>(
  SKILL_DEFINITIONS.map((skill) => [skill.slug, skill])
);

export const SKILL_DEFINITION_BY_SLUG: Record<string, SkillDefinition> = Object.fromEntries(
  SKILL_DEFINITIONS.map((skill) => [skill.slug, skill])
);

export const SKILL_SLUGS = new Set(SKILL_DEFINITIONS.map((skill) => skill.slug));

const SKILL_SLUG_BY_LOOKUP_KEY = new Map<string, string>();

function registerSkillLookup(input: string, slug: string) {
  const normalized = normalizeSkillLookupKey(input);
  if (!normalized) return;
  if (!SKILL_SLUG_BY_LOOKUP_KEY.has(normalized)) {
    SKILL_SLUG_BY_LOOKUP_KEY.set(normalized, slug);
  }
}

for (const skill of SKILL_DEFINITIONS) {
  registerSkillLookup(skill.slug, skill.slug);
  registerSkillLookup(skill.slug.replace(/_/g, " "), skill.slug);
  registerSkillLookup(skill.label, skill.slug);
}

for (const alias of SKILL_ALIAS_ENTRIES) {
  registerSkillLookup(alias.alias, alias.slug);
}

export function isValidSkillSlug(value: string | null | undefined): value is string {
  if (!value) return false;
  return SKILL_SLUGS.has(value);
}

export function getSkillDefinitionBySlug(slug: string | null | undefined): SkillDefinition | null {
  if (!slug) return null;
  return SKILL_DEFINITION_BY_SLUG_MAP.get(slug) || null;
}

/**
 * Resolves incoming skill values to canonical slugs.
 * Supports canonical slug, label variants, and aliases.
 */
export function resolveSkillSlug(value: string | null | undefined): string | null {
  if (!value) return null;

  const slugCandidate = normalizeSkillSlugCandidate(value);
  if (slugCandidate && SKILL_SLUGS.has(slugCandidate)) {
    return slugCandidate;
  }

  const lookup = normalizeSkillLookupKey(value);
  if (!lookup) return null;

  return SKILL_SLUG_BY_LOOKUP_KEY.get(lookup) || null;
}

export function mapSkillSlugsToDefinitions(slugs: string[]): SkillDefinition[] {
  return slugs
    .map((slug) => getSkillDefinitionBySlug(slug))
    .filter((skill): skill is SkillDefinition => Boolean(skill));
}
