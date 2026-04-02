import type { Invite } from "@/types";

interface InvitesResponse {
  data?: Invite[];
}

interface CreateInviteResponse {
  data?: Invite;
  error?: string;
}

async function parseJsonOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Request failed with status ${response.status}`);
  }
  return data;
}

export async function getUserInvites(): Promise<Invite[]> {
  const response = await fetch("/api/invites");
  const data = (await parseJsonOrThrow(response)) as InvitesResponse;
  return data.data || [];
}

export async function createInvite(): Promise<Invite> {
  const response = await fetch("/api/invites", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const data = (await parseJsonOrThrow(response)) as CreateInviteResponse;
  if (!data.data) {
    throw new Error("Invalid response from server");
  }

  return data.data;
}

export function findActiveInvite(invites: Invite[]): Invite | null {
  const now = new Date();

  const activeInvite = invites.find((invite) => {
    const isNotExpired = !invite.expires_at || new Date(invite.expires_at) >= now;
    let isWithinMaxUses = true;

    if (invite.max_uses !== null && invite.max_uses !== undefined) {
      const usesCount = invite.uses_count || 0;
      isWithinMaxUses = usesCount < invite.max_uses;
    }

    return isNotExpired && isWithinMaxUses;
  });

  return activeInvite || null;
}
