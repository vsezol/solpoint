import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Card } from "@/components/ui";
import { MapPin, Globe, Users, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Workspace } from "@/types";
import Image from "next/image";
import { EntityMembersWidget } from "@/components/entities/entity-members-widget";
import type { Metadata } from "next";
import { getAppUrl, isUUID } from "@/lib/utils";
import { WorkspaceViewTracker } from "@/components/analytics/workspace-view-tracker";
import { WorkspaceShareButton } from "@/components/analytics/workspace-share-button";
import { WorkspaceSocialLink } from "@/components/analytics/workspace-social-link";

interface WorkspacePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: WorkspacePageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  // Получаем воркспейс для метаданных - сначала по слагу, потом по ID
  let query = supabase
    .from("workspaces")
    .select("*");

  if (isUUID(slug)) {
    query = query.eq("id", slug);
  } else {
    query = query.eq("slug", slug);
  }

  const { data: workspaceData } = await query.single();

  if (!workspaceData) {
    return {
      title: "Workspace Not Found",
    };
  }

  const workspace = workspaceData as Workspace;
  const appUrl = getAppUrl();
  // Используем слаг из базы данных для URL, если он есть
  const workspaceUrl = `${appUrl}/workspaces/${workspace.slug || slug}`;
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

  // Получаем воркспейс - сначала по слагу, потом по ID (если параметр является UUID)
  let query = supabase
    .from("workspaces")
    .select("*");

  if (isUUID(slug)) {
    query = query.eq("id", slug);
  } else {
    query = query.eq("slug", slug);
  }

  const { data: workspaceData, error: workspaceError } = await query.single();

  if (workspaceError || !workspaceData) {
    notFound();
  }

  const workspace = workspaceData as Workspace;
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
      <WorkspaceViewTracker workspace={workspace} />
      <Header />
      <main className="min-h-screen bg-black pb-16 pt-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="w-full border-x border-white/10 bg-black">
            <div className="grid grid-cols-1 min-[830px]:grid-cols-[minmax(0,54fr)_minmax(0,46fr)] min-[1200px]:grid-cols-[minmax(0,599px)_minmax(0,601px)]">
              <section className="border-b border-white/10 px-6 pb-10 pt-8 sm:px-10 min-[830px]:min-h-[969px] min-[830px]:border-b-0 min-[830px]:border-r min-[830px]:border-r-white/10 min-[830px]:px-8 min-[1200px]:px-[45px]">
                <div className="relative mb-8 h-[220px] overflow-hidden rounded-[6px] border border-white/10 bg-[#121212] sm:h-[280px]">
                  {workspace.image_url ? (
                    <Image
                      src={workspace.image_url}
                      alt={workspace.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Building2 className="h-24 w-24 stroke-[1.5] text-white/45" />
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h1 className="mb-4 text-3xl font-semibold text-white sm:text-4xl" style={kodeMonoStyle}>
                        {workspace.name}
                      </h1>
                      {workspace.description && (
                        <p className="text-base leading-relaxed text-white/80 break-words [overflow-wrap:anywhere] sm:text-lg">
                          {workspace.description}
                        </p>
                      )}
                    </div>
                    <WorkspaceShareButton
                      workspace={workspace}
                      variant="outline"
                      className="h-[44px] w-[44px] shrink-0 rounded-[5px] border-white/30 bg-[#121212] px-0 text-white hover:bg-[#2a2a2a]"
                    />
                  </div>

                  <Card variant="bordered" className="rounded-[6px] border-white/10 bg-[#121212] p-5 sm:p-6">
                    <h2 className="mb-5 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
                      workspace details
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                        <div>
                          <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Address</p>
                          <p className="text-white/90 break-words [overflow-wrap:anywhere]">
                            {workspace.address}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                        <div>
                          <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Location</p>
                          <p className="text-white/90 break-words [overflow-wrap:anywhere]">
                            {workspace.city ? `${workspace.city}, ` : ""}{workspace.country}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Users className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                        <div>
                          <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Members</p>
                          <p className="text-white/90">
                            {workspace.members_count} {workspace.members_count === 1 ? "member" : "members"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Globe className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                        <div>
                          <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Created</p>
                          <p className="text-white/90">
                            {new Date(workspace.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {(workspace.socials?.twitter || workspace.socials?.instagram || workspace.socials?.facebook || workspace.socials?.website) && (
                    <Card variant="bordered" className="rounded-[6px] border-white/10 bg-[#121212] p-5 sm:p-6">
                      <h2 className="mb-5 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
                        social links
                      </h2>
                      <div className="flex flex-wrap items-center gap-3">
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
                </div>
              </section>

              <aside className="px-6 pb-10 pt-8 sm:px-10 min-[830px]:px-8 min-[1200px]:px-[50px]">
                <div className="mx-auto w-full max-w-[560px] min-[830px]:mx-0">
              {/* TODO: Temporarily commented out - join/attend functionality */}
              {/* <Card variant="bordered">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                      Join the Workspace
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Become a member of this workspace and connect with others.
                    </p>
                  </div>
                  {authUser ? (
                    <WorkspaceJoinButton 
                      workspace={workspace}
                      isMember={isUserMember}
                    />
                  ) : (
                    <Button variant="primary" className="w-full" size="lg" asChild>
                      <Link href="/login">
                        Join Workspace
                      </Link>
                    </Button>
                  )}
                  <WorkspaceShareButton 
                    workspace={workspace} 
                    variant="outline" 
                    size="lg"
                    className="w-full"
                  />
                </div>
              </Card> */}

              <EntityMembersWidget
                entityType="workspace"
                entityId={workspace.id}
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
