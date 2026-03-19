import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@/types";
import { ProfileV2Content } from "../profile-v2-content";

interface ProfileV2PageProps {
  params: Promise<{ username: string }>;
}

function mapFollowToFriendshipStatus(status: string | null): "none" | "pending_sent" | "pending_received" | "accepted" {
  if (status === "mutual") return "accepted";
  if (status === "following") return "pending_sent";
  if (status === "follower") return "pending_received";
  return "none";
}

export default async function ProfileV2Page({ params }: ProfileV2PageProps) {
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

  let initialFriendshipStatus: "none" | "pending_sent" | "pending_received" | "accepted" = "none";
  if (!isOwnProfile && authUser) {
    const { data: status } = await supabase.rpc("get_follow_status", {
      p_user_id: authUser.id,
      p_other_user_id: user.id,
    });
    initialFriendshipStatus = mapFollowToFriendshipStatus((status as string | null) || null);
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--color-background)] pt-20 pb-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ProfileV2Content
            user={user as User}
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
