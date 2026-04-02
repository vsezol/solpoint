-- v1 skill tags: normalize legacy free-text to canonical slugs + enforce unique tags per user.

CREATE OR REPLACE FUNCTION public.normalize_profile_skill_slug(raw_value TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT NULLIF(
    regexp_replace(
      regexp_replace(
        replace(replace(lower(trim(coalesce(raw_value, ''))), '&', ' and '), '+', ' plus '),
        '[^a-z0-9]+',
        '_',
        'g'
      ),
      '^_+|_+$',
      '',
      'g'
    ),
    ''
  );
$$;

UPDATE public.profile_skills
SET name = public.normalize_profile_skill_slug(name);

DELETE FROM public.profile_skills
WHERE name IS NULL
   OR name NOT IN (
    'frontend_development',
    'backend_development',
    'full_stack_development',
    'mobile_development',
    'smart_contract_development',
    'blockchain_development',
    'solana_development',
    'ethereum_development',
    'dapp_development',
    'devops',
    'infrastructure',
    'qa_testing',
    'security_engineering',
    'data_engineering',
    'ai_ml_engineering',
    'product_engineering',
    'ui_engineering',
    'api_development',
    'systems_architecture',
    'product_design',
    'ui_design',
    'ux_design',
    'graphic_design',
    'brand_design',
    'motion_design',
    '3d_design',
    'illustration',
    'web_design',
    'design_systems',
    'prototyping',
    'presentation_design',
    'product_management',
    'product_strategy',
    'growth_product_management',
    'user_research',
    'analytics',
    'a_b_testing',
    'roadmapping',
    'product_operations',
    'mvp_development',
    'go_to_market_strategy',
    'content_marketing',
    'social_media_marketing',
    'growth_marketing',
    'performance_marketing',
    'brand_marketing',
    'community_marketing',
    'influencer_marketing',
    'kol_marketing',
    'email_marketing',
    'seo',
    'copywriting',
    'storytelling',
    'memes_viral_content',
    'marketing_strategy',
    'business_development',
    'partnerships',
    'sponsorships',
    'sales',
    'lead_generation',
    'account_management',
    'b2b_sales',
    'negotiation',
    'fundraising',
    'investor_relations',
    'deal_flow',
    'ecosystem_partnerships',
    'operations',
    'project_management',
    'program_management',
    'event_operations',
    'community_operations',
    'people_operations',
    'recruiting',
    'customer_support',
    'customer_success',
    'entrepreneurship',
    'startup_strategy',
    'team_leadership',
    'hiring',
    'pitching',
    'market_research',
    'business_strategy',
    'revenue_operations',
    'monetization',
    'business_analysis',
    'community_building',
    'community_management',
    'moderation',
    'ambassador_programs',
    'developer_relations',
    'advocacy',
    'public_speaking',
    'event_hosting',
    'event_networking',
    'conference_speaking',
    'writing',
    'technical_writing',
    'editing',
    'video_editing',
    'podcasting',
    'streaming',
    'scriptwriting',
    'journalism',
    'newsletter_writing',
    'documentation',
    'crypto_content',
    'tokenomics',
    'defi',
    'trading',
    'onchain_analytics',
    'research',
    'dao_operations',
    'governance',
    'treasury_management',
    'nft_strategy',
    'nft_growth',
    'crypto_marketing',
    'web3_strategy',
    'token_launch_strategy',
    'defi_research',
    'onchain_research',
    'dao_governance',
    'legal_operations',
    'compliance',
    'policy_writing',
    'risk_management',
    'solana_ecosystem',
    'ecosystem_growth',
    'web3_business_development',
    'web3_recruiting',
    'crypto_partnerships'
  );

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, name
      ORDER BY sort_order ASC, created_at ASC, id ASC
    ) AS rn
  FROM public.profile_skills
)
DELETE FROM public.profile_skills p
USING ranked r
WHERE p.id = r.id
  AND r.rn > 1;

WITH normalized_order AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY sort_order ASC, created_at ASC, id ASC
    ) - 1 AS next_sort_order
  FROM public.profile_skills
)
UPDATE public.profile_skills p
SET sort_order = n.next_sort_order
FROM normalized_order n
WHERE p.id = n.id
  AND p.sort_order <> n.next_sort_order;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_skills_user_skill_unique
  ON public.profile_skills(user_id, name);
