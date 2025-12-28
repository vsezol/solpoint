import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Card } from "@/components/ui";
import { MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Community, User } from "@/types";
import Image from "next/image";
import type { Metadata } from "next";
import { getAppUrl } from "@/lib/utils";
import { CommunityViewTracker } from "@/components/analytics/community-view-tracker";
import { CommunityShareButton } from "@/components/analytics/community-share-button";
import { CommunitySocialLink } from "@/components/analytics/community-social-link";
import { TeamSection } from "@/components/entities/team-section";
import { MembersSidebar } from "@/components/entities/members-sidebar";
import { ActivitySection } from "@/components/entities/activity-section";
import { HowToGetInvolved } from "@/components/entities/how-to-get-involved";

interface CommunityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CommunityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  // Получаем комьюнити для метаданных
  const { data: communityData } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!communityData) {
    return {
      title: "Community Not Found",
    };
  }

  const community = communityData as Community;
  const appUrl = getAppUrl();
  const communityUrl = `${appUrl}/communities/${slug}`;
  // Используем картинку комьюнити, если она есть, иначе логотип
  const imageUrl = community.image_url && community.image_url.trim() !== ''
    ? (community.image_url.startsWith('http://') || community.image_url.startsWith('https://'))
      ? community.image_url
      : `${appUrl}${community.image_url.startsWith('/') ? '' : '/'}${community.image_url}`
    : `${appUrl}/logo.svg`;
  
  const location = community.city && community.country
    ? `${community.city}, ${community.country}`
    : community.country || "Global";
  
  const description = community.description 
    ? `${community.description} | ${location} | ${community.members_count} ${community.members_count === 1 ? "member" : "members"}`
    : `Solana community${community.country ? ` in ${location}` : ""} | ${community.members_count} ${community.members_count === 1 ? "member" : "members"}`;

  return {
    title: `${community.name} | SolPoint`,
    description: description,
    openGraph: {
      title: community.name,
      description: description,
      type: "website",
      url: communityUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: community.name,
        },
      ],
      siteName: "SolPoint",
    },
    twitter: {
      card: "summary_large_image",
      title: community.name,
      description: description,
      images: [imageUrl],
    },
  };
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Получаем текущего пользователя
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let isVip = false;
  if (authUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", authUser.id)
      .single();
    isVip = profile?.subscription_tier === "vip";
  }

  // Получаем комьюнити по slug
  const { data: communityData, error: communityError } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", slug)
    .single();

  if (communityError || !communityData) {
    notFound();
  }

  const community = communityData as Community;

  // Получаем команду (owners и moderators) и участников комьюнити (только если авторизован)
  let teamMembers: (User & { role?: "owner" | "moderator" | "member" })[] = [];
  let members: (User & { joined_at?: string })[] = [];
  let friends: User[] = [];
  let isUserMember = false;

  if (authUser) {
    // Проверяем, является ли пользователь участником комьюнити
    const { data: userMember } = await supabase
      .from("community_members")
      .select("id, joined_at, role")
      .eq("community_id", community.id)
      .eq("user_id", authUser.id)
      .single();

    isUserMember = !!userMember;

    // Получаем всех участников комьюнити с ролями
    const { data: membersData } = await supabase
      .from("community_members")
      .select(`
        joined_at,
        role,
        user:profiles!community_members_user_id_fkey(
          id,
          twitter_id,
          twitter_handle,
          twitter_name,
          avatar_url,
          bio,
          country,
          country_code,
          city,
          role,
          is_open_to_meet,
          subscription_tier,
          is_verified,
          wallet_address,
          socials,
          last_active_at,
          created_at,
          updated_at,
          countries!fk_profiles_country_code (
            name
          )
        )
      `)
      .eq("community_id", community.id)
      .order("joined_at", { ascending: false });

    const allMembers = (membersData || []).map((m: any) => {
      const user = Array.isArray(m.user) ? m.user[0] : m.user;
      return {
        ...user,
        joined_at: m.joined_at,
        role: m.role || "member",
      };
    }).filter((m): m is User & { joined_at?: string; role?: "owner" | "moderator" | "member" } => m !== null && m !== undefined);

    // Разделяем на команду и обычных участников
    teamMembers = allMembers.filter((m) => m.role === "owner" || m.role === "moderator");
    members = allMembers.filter((m) => m.role === "member" || !m.role).slice(0, 20);

    // Получаем взаимных друзей авторизованного пользователя
    const { data: mutualFriendsData } = await supabase
      .from("mutual_friends")
      .select("user_id, friend_id")
      .or(`user_id.eq.${authUser.id},friend_id.eq.${authUser.id}`);

    // Получаем ID всех друзей
    const friendIds: string[] = [];
    if (mutualFriendsData) {
      for (const mf of mutualFriendsData) {
        if (mf.user_id === authUser.id) {
          friendIds.push(mf.friend_id);
        } else if (mf.friend_id === authUser.id) {
          friendIds.push(mf.user_id);
        }
      }
    }

    // Находим друзей, которые являются участниками комьюнити
    if (friendIds.length > 0) {
      const memberUserIds = new Set(allMembers.map(m => m.id));
      const friendMemberIds = friendIds.filter(id => memberUserIds.has(id));

      if (friendMemberIds.length > 0) {
        const { data: friendsProfiles } = await supabase
          .from("profiles")
          .select(`
            id,
            twitter_id,
            twitter_handle,
            twitter_name,
            avatar_url,
            bio,
            country,
            country_code,
            city,
            role,
            is_open_to_meet,
            subscription_tier,
            is_verified,
            wallet_address,
            socials,
            last_active_at,
            created_at,
            updated_at,
            countries!fk_profiles_country_code (
              name
            )
          `)
          .in("id", friendMemberIds);

        friends = (friendsProfiles || []) as User[];
      }
    }
  }

  return (
    <>
      <CommunityViewTracker community={community} />
      <Header />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <div className="relative h-64 md:h-96 rounded-xl overflow-hidden mb-8 bg-gradient-to-br from-[var(--color-primary)]/20 via-[var(--color-primary)]/10 to-[var(--color-secondary)]/20">
            {community.image_url ? (
              <Image
                src={community.image_url}
                alt={community.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Users className="w-24 h-24 text-[var(--color-text-primary)] opacity-60 stroke-[1.5]" />
              </div>
            )}
          </div>

          {/* Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-4">
                    {community.name}
                  </h1>
                  {community.description && (
                    <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                      {community.description}
                    </p>
                  )}
                </div>
                <CommunityShareButton community={community} />
              </div>

              {/* Community Description */}
              {community.description && (
                <Card variant="bordered">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                    Community description
                  </h2>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed">
                    {community.description}
                  </p>
                </Card>
              )}

              {/* Location */}
              {community.country && (
                <Card variant="bordered">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                    <p className="text-[var(--color-text-primary)]">
                      {community.city ? `${community.city}, ` : ""}{community.country}
                    </p>
                  </div>
                </Card>
              )}

              {/* Activity */}
              <ActivitySection />

              {/* Social Links */}
              {(community.socials?.twitter || community.socials?.instagram || community.socials?.facebook || community.socials?.website) && (
                <Card variant="bordered">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                    Socials
                  </h2>
                  <div className="flex items-center gap-3">
                    {community.socials?.twitter && (
                      <CommunitySocialLink
                        community={community}
                        platform="twitter"
                        href={community.socials.twitter}
                      />
                    )}
                    {community.socials?.instagram && (
                      <CommunitySocialLink
                        community={community}
                        platform="instagram"
                        href={community.socials.instagram}
                      />
                    )}
                    {community.socials?.facebook && (
                      <CommunitySocialLink
                        community={community}
                        platform="facebook"
                        href={community.socials.facebook}
                      />
                    )}
                    {community.socials?.website && (
                      <CommunitySocialLink
                        community={community}
                        platform="website"
                        href={community.socials.website}
                      />
                    )}
                  </div>
                </Card>
              )}

              {/* How to get involved */}
              <HowToGetInvolved entityType="community" />

              {/* Team Section */}
              <TeamSection
                teamMembers={teamMembers}
                isVip={isVip}
                currentUserId={authUser?.id}
                entityType="community"
                title="Team"
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Members Sidebar */}
              <MembersSidebar
                members={members}
                friends={friends}
                isVip={isVip}
                authUser={authUser}
                entitySlug={community.slug}
                entityType="community"
                membersCount={community.members_count}
                friendsCount={friends.length}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

