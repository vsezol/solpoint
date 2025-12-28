import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { MapPin, Globe, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Community, User } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { UserCard } from "@/components/cards/user-card";
import type { Metadata } from "next";
import { getAppUrl } from "@/lib/utils";
import { CommunityViewTracker } from "@/components/analytics/community-view-tracker";
import { CommunityShareButton } from "@/components/analytics/community-share-button";
import { CommunitySocialLink } from "@/components/analytics/community-social-link";
import { CommunityJoinButton } from "@/components/analytics/community-join-button";

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

  // Получаем участников комьюнити (только если авторизован)
  let members: (User & { joined_at?: string })[] = [];
  let isUserMember = false;

  if (authUser) {
    // Проверяем, является ли пользователь участником комьюнити
    const { data: userMember } = await supabase
      .from("community_members")
      .select("id, joined_at")
      .eq("community_id", community.id)
      .eq("user_id", authUser.id)
      .single();

    isUserMember = !!userMember;

    // Получаем участников комьюнити
    const { data: membersData } = await supabase
      .from("community_members")
      .select(`
        joined_at,
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
      .order("joined_at", { ascending: false })
      .limit(20);

    members = (membersData || []).map((m: any) => {
      const user = Array.isArray(m.user) ? m.user[0] : m.user;
      return {
        ...user,
        joined_at: m.joined_at,
      };
    }).filter((m): m is User & { joined_at?: string } => m !== null && m !== undefined);
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

              {/* Details Card */}
              <Card variant="bordered">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                  Community Details
                </h2>
                <div className="space-y-4">
                  {community.country && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-[var(--color-text-muted)] mb-1">Location</p>
                        <p className="text-[var(--color-text-primary)]">
                          {community.city ? `${community.city}, ` : ""}{community.country}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)] mb-1">Members</p>
                      <p className="text-[var(--color-text-primary)]">
                        {community.members_count} {community.members_count === 1 ? "member" : "members"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)] mb-1">Created</p>
                      <p className="text-[var(--color-text-primary)]">
                        {new Date(community.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Social Links */}
              {(community.socials?.twitter || community.socials?.instagram || community.socials?.facebook || community.socials?.website) && (
                <Card variant="bordered">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                    Social Links
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
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Join Card */}
              <Card variant="bordered">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                      Join the Community
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Become a member of this community and connect with others.
                    </p>
                  </div>
                  {authUser ? (
                    <CommunityJoinButton 
                      community={community}
                      isMember={isUserMember}
                    />
                  ) : (
                    <Button variant="primary" className="w-full" size="lg" asChild>
                      <Link href="/login">
                        Join Community
                      </Link>
                    </Button>
                  )}
                  <CommunityShareButton 
                    community={community} 
                    variant="outline" 
                    size="lg"
                    className="w-full"
                  />
                </div>
              </Card>

              {/* Members Card */}
              <Card variant="bordered">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                  Members
                </h3>
                {authUser ? (
                  <div className="space-y-4">
                    {members.length > 0 ? (
                      <div className="space-y-3">
                        {members.slice(0, 5).map((member) => (
                          <UserCard
                            key={member.id}
                            user={member}
                            isVip={isVip}
                            compact={true}
                          />
                        ))}
                        {members.length > 5 && (
                          <p className="text-sm text-[var(--color-text-muted)] text-center">
                            +{members.length - 5} more members
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text-muted)] text-center">
                        No members yet
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="text-center">
                        <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                          Sign up or log in to see team members
                        </p>
                        <div className="flex gap-2">
                          <Button variant="primary" size="sm" asChild>
                            <Link href="/signup">Sign up</Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href="/login">Log in</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="blur-sm pointer-events-none opacity-50">
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="h-16 bg-[var(--color-surface-border)] rounded-lg" />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

