import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { createClient } from "@/lib/supabase/server";
import { ProfileViewTracker } from "@/components/analytics/profile-view-tracker";
import { ProfileV2Content } from "@/app/profile-v2/profile-v2-content";
import type { Metadata } from "next";
import { getAppUrl, isUUID } from "@/lib/utils";
import type { User } from "@/types";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

function mapFollowToFriendshipStatus(status: string | null): "none" | "pending_sent" | "pending_received" | "accepted" {
  if (status === "mutual") return "accepted";
  if (status === "following") return "pending_sent";
  if (status === "follower") return "pending_received";
  return "none";
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
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
    .eq(isUUID(cleanUsername) ? "id" : "twitter_handle", cleanUsername)
    .maybeSingle();

  if (!user) {
    return {
      title: "Profile Not Found",
    };
  }

  const appUrl = getAppUrl();
  const profileUrl = `${appUrl}/profile/${cleanUsername}`;
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
    title: `${user.twitter_name} | SolPoint`,
    description,
    openGraph: {
      title: `${user.twitter_name}`,
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
      title: `${user.twitter_name}`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const supabase = await createClient();
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
  const lookupById = isUUID(cleanUsername);

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
      .eq(lookupById ? "id" : "twitter_handle", cleanUsername)
      .maybeSingle(),
  ]);

  if (profileError || !user) {
    notFound();
  }

  const isOwnProfile = Boolean(authUser?.id && user.id && authUser.id === user.id);

  let initialFriendshipStatus: "none" | "pending_sent" | "pending_received" | "accepted" = "none";
  if (!isOwnProfile && authUser) {
    const { data: status } = await supabase.rpc("get_follow_status", {
      p_user_id: authUser.id,
      p_other_user_id: user.id,
    });
    initialFriendshipStatus = mapFollowToFriendshipStatus((status as string | null) || null);
  }

  const canRevealSocials = isOwnProfile || initialFriendshipStatus === "accepted";
  const safeUser = canRevealSocials
    ? (user as User)
    : ({
        ...(user as User),
        twitter_handle: null,
        twitter_id: null,
        socials: {},
      } as User);

  return (
    <>
      <Header />
      <ProfileViewTracker user={safeUser} isOwnProfile={isOwnProfile} />
      <main className="min-h-screen bg-black pt-20 pb-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ProfileV2Content
            user={safeUser}
            isOwnProfile={isOwnProfile}
            isAuthenticated={Boolean(authUser)}
            initialFriendshipStatus={initialFriendshipStatus}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
