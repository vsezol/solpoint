-- Migration: Add test members to various entities
-- Description: Adds test users to event, workspace, project, and community for testing the EntityMembersWidget

-- User IDs
-- 49191b2f-5532-4502-986c-2f0387948f1b
-- 19a845f0-4aa5-4cf8-9c11-8ed01cc73a92
-- 61b0659a-8f9c-43e2-add1-178118098428
-- f8646815-26ff-43a0-be78-552919bfc2cc
-- bec61439-31c9-47e4-85a2-f2c1801542e7

-- Entity IDs
-- workspace: 3e2cb8a5-3217-41f3-a6a8-997021631268
-- project: 110f509a-6e8d-4c9f-8beb-2d6fb79f3a83
-- community: ec1614ab-8bf6-464c-b893-4e27cbf7b218
-- event: 00000000-0000-0000-0000-000000000105

-- 1. Add users to event_members (event: 00000000-0000-0000-0000-000000000105)
INSERT INTO public.event_members (event_id, user_id, status, registered_at)
VALUES 
  ('00000000-0000-0000-0000-000000000105', '49191b2f-5532-4502-986c-2f0387948f1b', 'going', NOW()),
  ('00000000-0000-0000-0000-000000000105', '19a845f0-4aa5-4cf8-9c11-8ed01cc73a92', 'going', NOW()),
  ('00000000-0000-0000-0000-000000000105', '61b0659a-8f9c-43e2-add1-178118098428', 'going', NOW()),
  ('00000000-0000-0000-0000-000000000105', 'f8646815-26ff-43a0-be78-552919bfc2cc', 'maybe', NOW()),
  ('00000000-0000-0000-0000-000000000105', 'bec61439-31c9-47e4-85a2-f2c1801542e7', 'going', NOW())
ON CONFLICT (event_id, user_id) DO NOTHING;

-- 2. Add users to workspace_members (workspace: 3e2cb8a5-3217-41f3-a6a8-997021631268)
INSERT INTO public.workspace_members (workspace_id, user_id, joined_at)
VALUES 
  ('3e2cb8a5-3217-41f3-a6a8-997021631268', '49191b2f-5532-4502-986c-2f0387948f1b', NOW()),
  ('3e2cb8a5-3217-41f3-a6a8-997021631268', '19a845f0-4aa5-4cf8-9c11-8ed01cc73a92', NOW()),
  ('3e2cb8a5-3217-41f3-a6a8-997021631268', '61b0659a-8f9c-43e2-add1-178118098428', NOW()),
  ('3e2cb8a5-3217-41f3-a6a8-997021631268', 'f8646815-26ff-43a0-be78-552919bfc2cc', NOW()),
  ('3e2cb8a5-3217-41f3-a6a8-997021631268', 'bec61439-31c9-47e4-85a2-f2c1801542e7', NOW())
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 3. Add users to project_members (project: 110f509a-6e8d-4c9f-8beb-2d6fb79f3a83)
INSERT INTO public.project_members (project_id, user_id, joined_at)
VALUES 
  ('110f509a-6e8d-4c9f-8beb-2d6fb79f3a83', '49191b2f-5532-4502-986c-2f0387948f1b', NOW()),
  ('110f509a-6e8d-4c9f-8beb-2d6fb79f3a83', '19a845f0-4aa5-4cf8-9c11-8ed01cc73a92', NOW()),
  ('110f509a-6e8d-4c9f-8beb-2d6fb79f3a83', '61b0659a-8f9c-43e2-add1-178118098428', NOW()),
  ('110f509a-6e8d-4c9f-8beb-2d6fb79f3a83', 'f8646815-26ff-43a0-be78-552919bfc2cc', NOW()),
  ('110f509a-6e8d-4c9f-8beb-2d6fb79f3a83', 'bec61439-31c9-47e4-85a2-f2c1801542e7', NOW())
ON CONFLICT (project_id, user_id) DO NOTHING;

-- 4. Add users to community_members (community: ec1614ab-8bf6-464c-b893-4e27cbf7b218)
INSERT INTO public.community_members (community_id, user_id, joined_at)
VALUES 
  ('ec1614ab-8bf6-464c-b893-4e27cbf7b218', '49191b2f-5532-4502-986c-2f0387948f1b', NOW()),
  ('ec1614ab-8bf6-464c-b893-4e27cbf7b218', '19a845f0-4aa5-4cf8-9c11-8ed01cc73a92', NOW()),
  ('ec1614ab-8bf6-464c-b893-4e27cbf7b218', '61b0659a-8f9c-43e2-add1-178118098428', NOW()),
  ('ec1614ab-8bf6-464c-b893-4e27cbf7b218', 'f8646815-26ff-43a0-be78-552919bfc2cc', NOW()),
  ('ec1614ab-8bf6-464c-b893-4e27cbf7b218', 'bec61439-31c9-47e4-85a2-f2c1801542e7', NOW())
ON CONFLICT (community_id, user_id) DO NOTHING;

-- Note: members_count will be automatically updated by triggers

