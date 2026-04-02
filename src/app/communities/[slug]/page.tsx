import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Card } from "@/components/ui";
import { MapPin, Globe, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Community } from "@/types";
import Image from "next/image";
import { EntityMembersWidget } from "@/components/entities/entity-members-widget";
import type { Metadata } from "next";
import { getAppUrl, isUUID } from "@/lib/utils";
import { CommunityViewTracker } from "@/components/analytics/community-view-tracker";
import { CommunityShareButton } from "@/components/analytics/community-share-button";
import { CommunitySocialLink } from "@/components/analytics/community-social-link";

interface CommunityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CommunityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  // Получаем комьюнити для метаданных - сначала по слагу, потом по ID
  let query = supabase
    .from("communities")
    .select("*");

  if (isUUID(slug)) {
    query = query.eq("id", slug);
  } else {
    query = query.eq("slug", slug);
  }

  const { data: communityData } = await query.single();

  if (!communityData) {
    return {
      title: "Community Not Found",
    };
  }

  const community = communityData as Community;
  const appUrl = getAppUrl();
  // Используем слаг из базы данных для URL, если он есть
  const communityUrl = `${appUrl}/communities/${community.slug || slug}`;
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

  // Получаем комьюнити - сначала по слагу, потом по ID (если параметр является UUID)
  let query = supabase
    .from("communities")
    .select("*");

  if (isUUID(slug)) {
    query = query.eq("id", slug);
  } else {
    query = query.eq("slug", slug);
  }

  const { data: communityData, error: communityError } = await query.single();

  if (communityError || !communityData) {
    notFound();
  }

  const community = communityData as Community;
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
      <CommunityViewTracker community={community} />
      <Header />
      <main className="min-h-screen bg-black pb-16 pt-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="w-full border-x border-white/10 bg-black">
            <div className="grid grid-cols-1 min-[830px]:grid-cols-[minmax(0,54fr)_minmax(0,46fr)] min-[1200px]:grid-cols-[minmax(0,599px)_minmax(0,601px)]">
              <section className="border-b border-white/10 px-6 pb-10 pt-8 sm:px-10 min-[830px]:min-h-[969px] min-[830px]:border-b-0 min-[830px]:border-r min-[830px]:border-r-white/10 min-[830px]:px-8 min-[1200px]:px-[45px]">
                <div className="relative mb-8 h-[220px] overflow-hidden rounded-[6px] border border-white/10 bg-[#121212] sm:h-[280px]">
                  {community.image_url ? (
                    <Image
                      src={community.image_url}
                      alt={community.name}
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
                        {community.name}
                      </h1>
                      {community.description && (
                        <p className="text-base leading-relaxed text-white/80 break-words [overflow-wrap:anywhere] sm:text-lg">
                          {community.description}
                        </p>
                      )}
                    </div>
                    <CommunityShareButton
                      community={community}
                      variant="outline"
                      className="h-[44px] w-[44px] shrink-0 rounded-[5px] border-white/30 bg-[#121212] px-0 text-white hover:bg-[#2a2a2a]"
                    />
                  </div>

                  <Card variant="bordered" className="rounded-[6px] border-white/10 bg-[#121212] p-5 sm:p-6">
                    <h2 className="mb-5 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
                      community details
                    </h2>
                    <div className="space-y-4">
                      {community.country && (
                        <div className="flex items-start gap-3">
                          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                          <div>
                            <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Location</p>
                            <p className="text-white/90 break-words [overflow-wrap:anywhere]">
                              {community.city ? `${community.city}, ` : ""}{community.country}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <Users className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                        <div>
                          <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Members</p>
                          <p className="text-white/90">
                            {community.members_count} {community.members_count === 1 ? "member" : "members"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Globe className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                        <div>
                          <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Created</p>
                          <p className="text-white/90">
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

                  {(community.socials?.twitter || community.socials?.instagram || community.socials?.facebook || community.socials?.website) && (
                    <Card variant="bordered" className="rounded-[6px] border-white/10 bg-[#121212] p-5 sm:p-6">
                      <h2 className="mb-5 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
                        social links
                      </h2>
                      <div className="flex flex-wrap items-center gap-3">
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
              </section>

              <aside className="px-6 pb-10 pt-8 sm:px-10 min-[830px]:px-8 min-[1200px]:px-[50px]">
                <div className="mx-auto w-full max-w-[560px] min-[830px]:mx-0">
              {/* Join Card */}
              {/* TODO: Temporarily commented out - join/attend functionality */}
              {/* <Card variant="bordered">
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
              </Card> */}

              {/* Members Widget */}
              <EntityMembersWidget
                entityType="community"
                entityId={community.id}
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
