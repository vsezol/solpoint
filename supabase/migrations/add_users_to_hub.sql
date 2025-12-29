-- Add users to hub as members
-- Hub ID: 00000000-0000-0000-0000-000000000001
-- Users: 61b0659a-8f9c-43e2-add1-178118098428, 19cacc70-ebd8-4844-8c63-7624aafa0c96

INSERT INTO public.hub_members (hub_id, user_id, role, joined_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '61b0659a-8f9c-43e2-add1-178118098428', 'member', NOW()),
  ('00000000-0000-0000-0000-000000000001', '19cacc70-ebd8-4844-8c63-7624aafa0c96', 'member', NOW())
ON CONFLICT (hub_id, user_id) DO NOTHING;

-- Note: members_count will be automatically updated by the trigger

