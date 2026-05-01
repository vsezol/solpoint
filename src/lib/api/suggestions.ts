import type { User } from "@/types";

async function parseJsonOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Request failed with status ${response.status}`);
  }
  return data;
}

export async function getUserSuggestions(): Promise<Pick<User, "id" | "twitter_name" | "avatar_url" | "city" | "country" | "role" | "is_verified" | "subscription_tier">[]> {
  const response = await fetch("/api/users/suggestions", { cache: "no-store" });
  const data = (await parseJsonOrThrow(response)) as { items?: any[] };
  return (data.items || []) as any;
}

