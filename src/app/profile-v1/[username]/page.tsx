import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { createClient } from "@/lib/supabase/server";
import { isProfileQrEnabled } from "@/lib/qr/feature-flags";
import { ProfileContent } from "@/app/profile/profile-content";
import { ProfileEditProvider } from "@/app/profile/profile-edit-provider";
import type { Metadata } from "next";
import { getAppUrl } from "@/lib/utils";
import { ProfileViewTracker } from "@/components/analytics/profile-view-tracker";
import type { User } from "@/types";

interface ProfileV1PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfileV1PageProps): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;

  const { data: user } = await supabase
    .from("profiles")
    .select(`
      *,
      countries!fk_profiles_country_code (
        name
      )
    `)
    .eq("twitter_handle", cleanUsername)
    .maybeSingle();

  if (!user) {
    return {
      title: "Profile Not Found",
    };
  }

  const appUrl = getAppUrl();
  const profileUrl = `${appUrl}/profile-v1/${cleanUsername}`;
  const imageUrl = `${appUrl}/logo.svg`;

  const location = user.city && user.countries?.name
    ? `${user.city}, ${user.countries.name}`
    : user.countries?.name || user.city || "";

  const description = user.bio
    ? `${user.bio}${location ? ` | ${location}` : ""}`
    : location
      ? `Solana community member${location ? ` from ${location}` : ""}`
      : "Solana community member on SolPoint";

  return {
    title: `${user.twitter_name} (@${user.twitter_handle}) | SolPoint`,
    description,
    openGraph: {
      title: `${user.twitter_name} (@${user.twitter_handle})`,
      description,
      type: "profile",
      url: profileUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: user.twitter_name,
        },
      ],
      siteName: "SolPoint",
    },
    twitter: {
      card: "summary_large_image",
      title: `${user.twitter_name} (@${user.twitter_handle})`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProfileV1Page({ params }: ProfileV1PageProps) {
  const { username } = await params;
  const supabase = await createClient();
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;

  const [
    { data: { user: authUser } },
    { data: user, error: profileError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("profiles")
      .select(`
        *,
        countries!fk_profiles_country_code (
          name
        )
      `)
      .eq("twitter_handle", cleanUsername)
      .maybeSingle(),
  ]);

  if (profileError || !user) {
    notFound();
  }

  const isOwnProfile = Boolean(authUser?.id && user.id && authUser.id === user.id);

  return (
    <>
      <Header />
      <ProfileViewTracker user={user as User} isOwnProfile={isOwnProfile} />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <ProfileEditProvider>
            <ProfileContent
              user={user}
              isOwnProfile={isOwnProfile}
              profileQrEnabled={isProfileQrEnabled()}
            />
          </ProfileEditProvider>
        </div>
      </main>
      <Footer />
    </>
  );
}
