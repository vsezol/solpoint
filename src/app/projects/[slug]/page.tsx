import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Card } from "@/components/ui";
import { MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Project, User } from "@/types";
import Image from "next/image";
import type { Metadata } from "next";
import { getAppUrl } from "@/lib/utils";
import { ProjectViewTracker } from "@/components/analytics/project-view-tracker";
import { ProjectShareButton } from "@/components/analytics/project-share-button";
import { ProjectSocialLink } from "@/components/analytics/project-social-link";
import { TeamSection } from "@/components/entities/team-section";
import { MembersSidebar } from "@/components/entities/members-sidebar";
import { ActivitySection } from "@/components/entities/activity-section";
import { HowToGetInvolved } from "@/components/entities/how-to-get-involved";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: projectData } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!projectData) {
    return {
      title: "Project Not Found",
    };
  }

  const project = projectData as Project;
  const appUrl = getAppUrl();
  const projectUrl = `${appUrl}/projects/${slug}`;
  const imageUrl = project.image_url && project.image_url.trim() !== ''
    ? (project.image_url.startsWith('http://') || project.image_url.startsWith('https://'))
      ? project.image_url
      : `${appUrl}${project.image_url.startsWith('/') ? '' : '/'}${project.image_url}`
    : `${appUrl}/logo.svg`;
  
  const location = project.city && project.country
    ? `${project.city}, ${project.country}`
    : project.country || "Global";
  
  const description = project.description 
    ? `${project.description} | ${location} | ${project.members_count} ${project.members_count === 1 ? "member" : "members"}`
    : `Solana project${project.country ? ` in ${location}` : ""} | ${project.members_count} ${project.members_count === 1 ? "member" : "members"}`;

  return {
    title: `${project.name} | SolPoint`,
    description: description,
    openGraph: {
      title: project.name,
      description: description,
      type: "website",
      url: projectUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: project.name,
        },
      ],
      siteName: "SolPoint",
    },
    twitter: {
      card: "summary_large_image",
      title: project.name,
      description: description,
      images: [imageUrl],
    },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
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

  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .single();

  if (projectError || !projectData) {
    notFound();
  }

  const project = projectData as Project;

  // Получаем команду (owners и moderators) и участников проекта (только если авторизован)
  let teamMembers: (User & { role?: "owner" | "moderator" | "member" })[] = [];
  let members: (User & { joined_at?: string })[] = [];
  let friends: User[] = [];
  let isUserMember = false;

  if (authUser) {
    const { data: userMember } = await supabase
      .from("project_members")
      .select("id, joined_at, role")
      .eq("project_id", project.id)
      .eq("user_id", authUser.id)
      .single();

    isUserMember = !!userMember;

    const { data: membersData } = await supabase
      .from("project_members")
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
      .eq("project_id", project.id)
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
      <ProjectViewTracker project={project} />
      <Header />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="relative h-64 md:h-96 rounded-xl overflow-hidden mb-8 bg-gradient-to-br from-[var(--color-primary)]/20 via-[var(--color-primary)]/10 to-[var(--color-secondary)]/20">
            {project.image_url ? (
              <Image
                src={project.image_url}
                alt={project.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Users className="w-24 h-24 text-[var(--color-text-primary)] opacity-60 stroke-[1.5]" />
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-4">
                    {project.name}
                  </h1>
                  {project.description && (
                    <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </div>
                <ProjectShareButton project={project} />
              </div>

              {/* Project Description */}
              {project.description && (
                <Card variant="bordered">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                    Project description
                  </h2>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed">
                    {project.description}
                  </p>
                </Card>
              )}

              {/* Location */}
              {project.country && (
                <Card variant="bordered">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                    <p className="text-[var(--color-text-primary)]">
                      {project.city ? `${project.city}, ` : ""}{project.country}
                    </p>
                  </div>
                </Card>
              )}

              {/* Activity */}
              <ActivitySection />

              {/* Social Links */}
              {(project.socials?.twitter || project.socials?.instagram || project.socials?.facebook || project.socials?.website) && (
                <Card variant="bordered">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                    Socials
                  </h2>
                  <div className="flex items-center gap-3">
                    {project.socials?.twitter && (
                      <ProjectSocialLink
                        project={project}
                        platform="twitter"
                        href={project.socials.twitter}
                      />
                    )}
                    {project.socials?.instagram && (
                      <ProjectSocialLink
                        project={project}
                        platform="instagram"
                        href={project.socials.instagram}
                      />
                    )}
                    {project.socials?.facebook && (
                      <ProjectSocialLink
                        project={project}
                        platform="facebook"
                        href={project.socials.facebook}
                      />
                    )}
                    {project.socials?.website && (
                      <ProjectSocialLink
                        project={project}
                        platform="website"
                        href={project.socials.website}
                      />
                    )}
                  </div>
                </Card>
              )}

              {/* How to get involved */}
              <HowToGetInvolved entityType="project" />

              {/* Team Section */}
              <TeamSection
                teamMembers={teamMembers}
                isVip={isVip}
                currentUserId={authUser?.id}
                entityType="project"
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
                entitySlug={project.slug}
                entityType="project"
                membersCount={project.members_count}
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

