import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { MapPin, Globe, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Project, User } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { UserCard } from "@/components/cards/user-card";
import type { Metadata } from "next";
import { getAppUrl } from "@/lib/utils";
import { ProjectViewTracker } from "@/components/analytics/project-view-tracker";
import { ProjectShareButton } from "@/components/analytics/project-share-button";
import { ProjectSocialLink } from "@/components/analytics/project-social-link";
import { ProjectJoinButton } from "@/components/analytics/project-join-button";

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

  let members: (User & { joined_at?: string })[] = [];
  let isUserMember = false;

  if (authUser) {
    const { data: userMember } = await supabase
      .from("project_members")
      .select("id, joined_at")
      .eq("project_id", project.id)
      .eq("user_id", authUser.id)
      .single();

    isUserMember = !!userMember;

    const { data: membersData } = await supabase
      .from("project_members")
      .select(`
        joined_at,
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

              <Card variant="bordered">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                  Project Details
                </h2>
                <div className="space-y-4">
                  {project.country && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-[var(--color-text-muted)] mb-1">Location</p>
                        <p className="text-[var(--color-text-primary)]">
                          {project.city ? `${project.city}, ` : ""}{project.country}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)] mb-1">Members</p>
                      <p className="text-[var(--color-text-primary)]">
                        {project.members_count} {project.members_count === 1 ? "member" : "members"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)] mb-1">Created</p>
                      <p className="text-[var(--color-text-primary)]">
                        {new Date(project.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {(project.socials?.twitter || project.socials?.instagram || project.socials?.facebook || project.socials?.website) && (
                <Card variant="bordered">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                    Social Links
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
            </div>

            <div className="space-y-6">
              <Card variant="bordered">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                      Join the Project
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Become a member of this project and connect with others.
                    </p>
                  </div>
                  {authUser ? (
                    <ProjectJoinButton 
                      project={project}
                      isMember={isUserMember}
                    />
                  ) : (
                    <Button variant="primary" className="w-full" size="lg" asChild>
                      <Link href="/login">
                        Join Project
                      </Link>
                    </Button>
                  )}
                  <ProjectShareButton 
                    project={project} 
                    variant="outline" 
                    size="lg"
                    className="w-full"
                  />
                </div>
              </Card>

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

