import type { Interest } from "@/types";

interface InterestsResponse {
  items?: Interest[];
  error?: string;
}

export async function getInterests(): Promise<Interest[]> {
  const response = await fetch("/api/interests", {
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as InterestsResponse;

  if (!response.ok) {
    throw new Error(data.error || "Failed to load interests");
  }

  return Array.isArray(data.items) ? data.items : [];
}
