import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Card } from "@/components/ui";
import { MapPin, Users, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Workspace, User } from "@/types";
import Image from "next/image";
import type { Metadata } from "next";
import { getAppUrl } from "@/lib/utils";
import { WorkspaceViewTracker } from "@/components/analytics/workspace-view-tracker";
import { WorkspaceShareButton } from "@/components/analytics/workspace-share-button";
import { WorkspaceSocialLink } from "@/components/analytics/workspace-social-link";
import { TeamSection } from "@/components/entities/team-section";
import { MembersSidebar } from "@/components/entities/members-sidebar";
import { ActivitySection } from "@/components/entities/activity-section";
import { HowToGetInvolved } from "@/components/entities/how-to-get-involved";

interface WorkspacePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: WorkspacePageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: workspaceData } = await supabase
    .from("workspaces")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!workspaceData) {
    return {
      title: "Workspace Not Found",
    };
  }

  const workspace = workspaceData as Workspace;
  const appUrl = getAppUrl();
  const workspaceUrl = `${appUrl}/workspaces/${slug}`;
  const imageUrl = workspace.image_url && workspace.image_url.trim() !== ''
    ? (workspace.image_url.startsWith('http://') || workspace.image_url.startsWith('https://'))
      ? workspace.image_url
      : `${appUrl}${workspace.image_url.startsWith('/') ? '' : '/'}${workspace.image_url}`
    : `${appUrl}/logo.svg`;
  
  const location = workspace.city
    ? `${workspace.city}, ${workspace.country}`
    : workspace.country;
  
  const description = workspace.description 
    ? `${workspace.description} | ${location} | ${workspace.members_count} ${workspace.members_count === 1 ? "member" : "members"}`
    : `Solana workspace in ${location} | ${workspace.members_count} ${workspace.members_count === 1 ? "member" : "members"}`;

  return {
    title: `${workspace.name} | SolPoint`,
    description: description,
    openGraph: {
      title: workspace.name,
      description: description,
      type: "website",
      url: workspaceUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: workspace.name,
        },
      ],
      siteName: "SolPoint",
    },
    twitter: {
      card: "summary_large_image",
      title: workspace.name,
      description: description,
      images: [imageUrl],
    },
  };
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { slug } = await params;
  const supabase = await createClient();

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

  const { data: workspaceData, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("slug", slug)
    .single();

  if (workspaceError || !workspaceData) {
    notFound();
  }

  const workspace = workspaceData as Workspace;

  // Получаем команду (owners и moderators) и участников воркспейса (только если авторизован)
  let teamMembers: (User & { role?: "owner" | "moderator" | "member" })[] = [];
  let members: (User & { joined_at?: string })[] = [];
  let friends: User[] = [];
  let isUserMember = false;

  if (authUser) {
    const { data: userMember } = await supabase
      .from("workspace_members")
      .select("id, joined_at, role")
      .eq("workspace_id", workspace.id)
      .eq("user_id", authUser.id)
      .single();

    isUserMember = !!userMember;

    const { data: membersData } = await supabase
      .from("workspace_members")
      .select(`
        joined_at,
        role,
        user:profiles(
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
      .eq("workspace_id", workspace.id)
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
      <WorkspaceViewTracker workspace={workspace} />
      <Header />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="relative h-64 md:h-96 rounded-xl overflow-hidden mb-8 bg-gradient-to-br from-[var(--color-primary)]/20 via-[var(--color-primary)]/10 to-[var(--color-secondary)]/20">
            {workspace.image_url ? (
              <Image
                src={workspace.image_url}
                alt={workspace.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="w-24 h-24 text-[var(--color-text-primary)] opacity-60 stroke-[1.5]" />
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-4">
                    {workspace.name}
                  </h1>
                  {workspace.description && (
                    <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                      {workspace.description}
                    </p>
                  )}
                </div>
                <WorkspaceShareButton workspace={workspace} />
              </div>

              {/* Workspace Description */}
              {workspace.description && (
                <Card variant="bordered">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                    Workspace description
                  </h2>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed">
                    {workspace.description}
                  </p>
                </Card>
              )}

              {/* Location */}
              <Card variant="bordered">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                  <div>
                    {workspace.address && (
                      <p className="text-[var(--color-text-primary)] mb-1">
                        {workspace.address}
                      </p>
                    )}
                    <p className="text-[var(--color-text-primary)]">
                      {workspace.city ? `${workspace.city}, ` : ""}{workspace.country}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Activity */}
              <ActivitySection />

              {/* Social Links */}
              {(workspace.socials?.twitter || workspace.socials?.instagram || workspace.socials?.facebook || workspace.socials?.website) && (
                <Card variant="bordered">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                    Socials
                  </h2>
                  <div className="flex items-center gap-3">
                    {workspace.socials?.twitter && (
                      <WorkspaceSocialLink
                        workspace={workspace}
                        platform="twitter"
                        href={workspace.socials.twitter}
                      />
                    )}
                    {workspace.socials?.instagram && (
                      <WorkspaceSocialLink
                        workspace={workspace}
                        platform="instagram"
                        href={workspace.socials.instagram}
                      />
                    )}
                    {workspace.socials?.facebook && (
                      <WorkspaceSocialLink
                        workspace={workspace}
                        platform="facebook"
                        href={workspace.socials.facebook}
                      />
                    )}
                    {workspace.socials?.website && (
                      <WorkspaceSocialLink
                        workspace={workspace}
                        platform="website"
                        href={workspace.socials.website}
                      />
                    )}
                  </div>
                </Card>
              )}

              {/* How to get involved */}
              <HowToGetInvolved entityType="workspace" />

              {/* Team Section */}
              <TeamSection
                teamMembers={teamMembers}
                isVip={isVip}
                currentUserId={authUser?.id}
                entityType="workspace"
                title="Team"
              />
            </div>

            <div className="space-y-6">
              {/* Members Sidebar */}
              <MembersSidebar
                members={members}
                friends={friends}
                isVip={isVip}
                authUser={authUser}
                entitySlug={workspace.slug}
                entityType="workspace"
                membersCount={workspace.members_count}
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

