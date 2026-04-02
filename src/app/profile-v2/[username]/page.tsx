import { redirect } from "next/navigation";

interface ProfileV2PageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProfileV2Page({ params, searchParams }: ProfileV2PageProps) {
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
