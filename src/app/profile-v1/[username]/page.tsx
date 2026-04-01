import { redirect } from "next/navigation";
import type { Metadata } from "next";

interface ProfileV1PageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * @deprecated Profile v1 is kept only for backward-compatible links.
 * All traffic is redirected to the current profile route.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Profile v1 (Deprecated) | SolPoint",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ProfileV1Page({ params, searchParams }: ProfileV1PageProps) {
  const { username } = await params;
  const query = await searchParams;
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;

  const nextParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => nextParams.append(key, entry));
      return;
    }
    if (typeof value === "string") {
      nextParams.set(key, value);
    }
  });

  const queryString = nextParams.toString();
  redirect(`/profile/${cleanUsername}${queryString ? `?${queryString}` : ""}`);
}
