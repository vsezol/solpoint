import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { MapPin, Globe, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Community } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { EntityMembersWidget } from "@/components/entities/entity-members-widget";
import type { Metadata } from "next";
import { getAppUrl, isUUID } from "@/lib/utils";
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
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

