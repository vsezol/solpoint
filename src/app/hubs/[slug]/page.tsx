import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Card } from "@/components/ui";
import { MapPin, Globe, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Hub } from "@/types";
import Image from "next/image";
import { EntityMembersWidget } from "@/components/entities/entity-members-widget";
import type { Metadata } from "next";
import { getAppUrl, isUUID } from "@/lib/utils";
import { HubViewTracker } from "@/components/analytics/hub-view-tracker";
import { HubShareButton } from "@/components/analytics/hub-share-button";
import { HubSocialLink } from "@/components/analytics/hub-social-link";

interface HubPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: HubPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  // Получаем хаб для метаданных - сначала по слагу, потом по ID
  let query = supabase
    .from("hubs")
    .select("*");

  if (isUUID(slug)) {
    query = query.eq("id", slug);
  } else {
    query = query.eq("slug", slug);
  }

  const { data: hubData } = await query.single();

  if (!hubData) {
    return {
      title: "Hub Not Found",
    };
  }

  const hub = hubData as Hub;
  const appUrl = getAppUrl();
  // Используем слаг из базы данных для URL, если он есть
  const hubUrl = `${appUrl}/hubs/${hub.slug || slug}`;
  // Используем картинку хаба, если она есть, иначе логотип
  const imageUrl = hub.image_url && hub.image_url.trim() !== ''
    ? (hub.image_url.startsWith('http://') || hub.image_url.startsWith('https://'))
      ? hub.image_url
      : `${appUrl}${hub.image_url.startsWith('/') ? '' : '/'}${hub.image_url}`
    : `${appUrl}/logo.svg`;
  
  const location = hub.city 
    ? `${hub.city}, ${hub.country}`
    : hub.country;
  
  const description = hub.description 
    ? `${hub.description} | ${location} | ${hub.members_count} ${hub.members_count === 1 ? "member" : "members"}`
    : `Solana hub in ${location} | ${hub.members_count} ${hub.members_count === 1 ? "member" : "members"}`;

  return {
    title: `${hub.name} | SolPoint`,
    description: description,
    openGraph: {
      title: hub.name,
      description: description,
      type: "website",
      url: hubUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: hub.name,
        },
      ],
      siteName: "SolPoint",
    },
    twitter: {
      card: "summary_large_image",
      title: hub.name,
      description: description,
      images: [imageUrl],
    },
  };
}

export default async function HubPage({ params }: HubPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  // Получаем хаб - сначала по слагу, потом по ID (если параметр является UUID)
  let query = supabase
    .from("hubs")
    .select("*");

  if (isUUID(slug)) {
    query = query.eq("id", slug);
  } else {
    query = query.eq("slug", slug);
  }

  const { data: hubData, error: hubError } = await query.single();

  if (hubError || !hubData) {
    notFound();
  }

  const hub = hubData as Hub;
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
      <Header />
      <HubViewTracker hub={hub} />
      <main className="min-h-screen bg-black pb-16 pt-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="w-full border-x border-white/10 bg-black">
            <div className="grid grid-cols-1 min-[830px]:grid-cols-[minmax(0,54fr)_minmax(0,46fr)] min-[1200px]:grid-cols-[minmax(0,599px)_minmax(0,601px)]">
              <section className="border-b border-white/10 px-6 pb-10 pt-8 sm:px-10 min-[830px]:min-h-[969px] min-[830px]:border-b-0 min-[830px]:border-r min-[830px]:border-r-white/10 min-[830px]:px-8 min-[1200px]:px-[45px]">
                <div className="relative mb-8 h-[220px] overflow-hidden rounded-[6px] border border-white/10 bg-[#121212] sm:h-[280px]">
                  {hub.image_url ? (
                    <Image
                      src={hub.image_url}
                      alt={hub.name}
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
                        {hub.name}
                      </h1>
                      {hub.description && (
                        <p className="text-base leading-relaxed text-white/80 break-words [overflow-wrap:anywhere] sm:text-lg">
                          {hub.description}
                        </p>
                      )}
                    </div>
                    <HubShareButton
                      hub={hub}
                      variant="outline"
                      className="h-[44px] w-[44px] shrink-0 rounded-[5px] border-white/30 bg-[#121212] px-0 text-white hover:bg-[#2a2a2a]"
                    />
                  </div>

                  <Card variant="bordered" className="rounded-[6px] border-white/10 bg-[#121212] p-5 sm:p-6">
                    <h2 className="mb-5 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
                      hub details
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                        <div>
                          <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Location</p>
                          <p className="text-white/90 break-words [overflow-wrap:anywhere]">
                            {hub.city ? `${hub.city}, ` : ""}{hub.country}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Users className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                        <div>
                          <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Members</p>
                          <p className="text-white/90">
                            {hub.members_count} {hub.members_count === 1 ? "member" : "members"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Globe className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                        <div>
                          <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Created</p>
                          <p className="text-white/90">
                            {new Date(hub.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {(hub.socials?.twitter || hub.socials?.instagram || hub.socials?.facebook || hub.socials?.website) && (
                    <Card variant="bordered" className="rounded-[6px] border-white/10 bg-[#121212] p-5 sm:p-6">
                      <h2 className="mb-5 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
                        social links
                      </h2>
                      <div className="flex flex-wrap items-center gap-3">
                        {hub.socials?.twitter && (
                          <HubSocialLink
                            hub={hub}
                            platform="twitter"
                            href={hub.socials.twitter}
                          />
                        )}
                        {hub.socials?.instagram && (
                          <HubSocialLink
                            hub={hub}
                            platform="instagram"
                            href={hub.socials.instagram}
                          />
                        )}
                        {hub.socials?.facebook && (
                          <HubSocialLink
                            hub={hub}
                            platform="facebook"
                            href={hub.socials.facebook}
                          />
                        )}
                        {hub.socials?.website && (
                          <HubSocialLink
                            hub={hub}
                            platform="website"
                            href={hub.socials.website}
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
                      Join the Hub
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Become a member of this hub and connect with the community.
                    </p>
                  </div>
                  {authUser ? (
                    <HubJoinButton 
                      hub={hub}
                      isMember={isUserMember}
                    />
                  ) : (
                    <Button variant="primary" className="w-full" size="lg" asChild>
                      <Link href="/login">
                        Join Hub
                      </Link>
                    </Button>
                  )}
                  <HubShareButton 
                    hub={hub} 
                    variant="outline" 
                    size="lg"
                    className="w-full"
                  />
                </div>
              </Card> */}

              {/* Members Widget */}
              <EntityMembersWidget
                entityType="hub"
                entityId={hub.id}
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
