import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Card } from "@/components/ui";
import { MapPin, Globe, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/types";
import Image from "next/image";
import { EntityMembersWidget } from "@/components/entities/entity-members-widget";
import type { Metadata } from "next";
import { getAppUrl, isUUID } from "@/lib/utils";
import { ProjectViewTracker } from "@/components/analytics/project-view-tracker";
import { ProjectShareButton } from "@/components/analytics/project-share-button";
import { ProjectSocialLink } from "@/components/analytics/project-social-link";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  // Получаем проект для метаданных - сначала по слагу, потом по ID
  let query = supabase
    .from("projects")
    .select("*");

  if (isUUID(slug)) {
    query = query.eq("id", slug);
  } else {
    query = query.eq("slug", slug);
  }

  const { data: projectData } = await query.single();

  if (!projectData) {
    return {
      title: "Project Not Found",
    };
  }

  const project = projectData as Project;
  const appUrl = getAppUrl();
  // Используем слаг из базы данных для URL, если он есть
  const projectUrl = `${appUrl}/projects/${project.slug || slug}`;
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

  // Получаем проект - сначала по слагу, потом по ID (если параметр является UUID)
  let query = supabase
    .from("projects")
    .select("*");

  if (isUUID(slug)) {
    query = query.eq("id", slug);
  } else {
    query = query.eq("slug", slug);
  }

  const { data: projectData, error: projectError } = await query.single();

  if (projectError || !projectData) {
    notFound();
  }

  const project = projectData as Project;
  const kodeMonoStyle = { fontFamily: "var(--font-kode-mono), monospace" } as const;
  const sectionHeadingStyle = {
    fontFamily: "var(--font-display), sans-serif",
    fontWeight: 700,
    fontSize: 15,
    lineHeight: "12px",
    letterSpacing: "2px",
  } as const;

  return (
    <>
      <ProjectViewTracker project={project} />
      <Header />
      <main className="min-h-screen bg-black pb-16 pt-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="w-full border-x border-white/10 bg-black">
            <div className="grid grid-cols-1 min-[830px]:grid-cols-[minmax(0,54fr)_minmax(0,46fr)] min-[1200px]:grid-cols-[minmax(0,599px)_minmax(0,601px)]">
              <section className="border-b border-white/10 px-6 pb-10 pt-8 sm:px-10 min-[830px]:min-h-[969px] min-[830px]:border-b-0 min-[830px]:border-r min-[830px]:border-r-white/10 min-[830px]:px-8 min-[1200px]:px-[45px]">
                <div className="relative mb-8 h-[220px] overflow-hidden rounded-[6px] border border-white/10 bg-[#121212] sm:h-[280px]">
                  {project.image_url ? (
                    <Image
                      src={project.image_url}
                      alt={project.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Users className="h-24 w-24 stroke-[1.5] text-white/45" />
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h1 className="mb-4 text-3xl font-semibold text-white sm:text-4xl" style={kodeMonoStyle}>
                        {project.name}
                      </h1>
                      {project.description && (
                        <p className="text-base leading-relaxed text-white/80 break-words [overflow-wrap:anywhere] sm:text-lg">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <ProjectShareButton
                      project={project}
                      variant="outline"
                      className="h-[44px] w-[44px] shrink-0 rounded-[5px] border-white/30 bg-[#121212] px-0 text-white hover:bg-[#2a2a2a]"
                    />
                  </div>

                  <Card variant="bordered" className="rounded-[6px] border-white/10 bg-[#121212] p-5 sm:p-6">
                    <h2 className="mb-5 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
                      project details
                    </h2>
                    <div className="space-y-4">
                      {project.country && (
                        <div className="flex items-start gap-3">
                          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                          <div>
                            <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Location</p>
                            <p className="text-white/90 break-words [overflow-wrap:anywhere]">
                              {project.city ? `${project.city}, ` : ""}{project.country}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <Users className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                        <div>
                          <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Members</p>
                          <p className="text-white/90">
                            {project.members_count} {project.members_count === 1 ? "member" : "members"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Globe className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                        <div>
                          <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Created</p>
                          <p className="text-white/90">
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
                    <Card variant="bordered" className="rounded-[6px] border-white/10 bg-[#121212] p-5 sm:p-6">
                      <h2 className="mb-5 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
                        social links
                      </h2>
                      <div className="flex flex-wrap items-center gap-3">
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
              </section>

              <aside className="px-6 pb-10 pt-8 sm:px-10 min-[830px]:px-8 min-[1200px]:px-[50px]">
                <div className="mx-auto w-full max-w-[560px] min-[830px]:mx-0">
              {/* TODO: Temporarily commented out - join/attend functionality */}
              {/* <Card variant="bordered">
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
              </Card> */}

              <EntityMembersWidget
                entityType="project"
                entityId={project.id}
              />
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
