import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { MapPin, Globe, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Hub, User } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { HubMembersCard } from "./hub-members-card";
import type { Metadata } from "next";
import { getAppUrl } from "@/lib/utils";
import { HubViewTracker } from "@/components/analytics/hub-view-tracker";
import { HubShareButton } from "@/components/analytics/hub-share-button";
import { HubSocialLink } from "@/components/analytics/hub-social-link";
import { HubJoinButton } from "@/components/analytics/hub-join-button";

interface HubPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: HubPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  // Получаем хаб для метаданных
  const { data: hubData } = await supabase
    .from("hubs")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!hubData) {
    return {
      title: "Hub Not Found",
    };
  }

  const hub = hubData as Hub;
  const appUrl = getAppUrl();
  const hubUrl = `${appUrl}/hubs/${slug}`;
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

  // Получаем хаб по slug
  const { data: hubData, error: hubError } = await supabase
    .from("hubs")
    .select("*")
    .eq("slug", slug)
    .single();

  if (hubError || !hubData) {
    notFound();
  }

  const hub = hubData as Hub;

  // Получаем участников хаба (только если авторизован)
  let members: (User & { joined_at?: string })[] = [];
  let isUserMember = false;

  if (authUser) {
    // Проверяем, является ли пользователь участником хаба
    const { data: userMember } = await supabase
      .from("hub_members")
      .select("id, joined_at")
      .eq("hub_id", hub.id)
      .eq("user_id", authUser.id)
      .single();

    isUserMember = !!userMember;

    // Получаем участников хаба
    const { data: membersData } = await supabase
      .from("hub_members")
      .select(`
        joined_at,
        user:profiles!hub_members_user_id_fkey(
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
      .eq("hub_id", hub.id)
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
      <Header />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <div className="relative h-64 md:h-96 rounded-xl overflow-hidden mb-8 bg-gradient-to-br from-[var(--color-primary)]/20 via-[var(--color-primary)]/10 to-[var(--color-secondary)]/20">
            {hub.image_url ? (
              <Image
                src={hub.image_url}
                alt={hub.name}
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
                    {hub.name}
                  </h1>
                  {hub.description && (
                    <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                      {hub.description}
                    </p>
                  )}
                </div>
                <HubShareButton hub={hub} />
              </div>

              {/* Details Card */}
              <Card variant="bordered">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                  Hub Details
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)] mb-1">Location</p>
                      <p className="text-[var(--color-text-primary)]">
                        {hub.city ? `${hub.city}, ` : ""}{hub.country}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)] mb-1">Members</p>
                      <p className="text-[var(--color-text-primary)]">
                        {hub.members_count} {hub.members_count === 1 ? "member" : "members"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)] mb-1">Created</p>
                      <p className="text-[var(--color-text-primary)]">
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

              {/* Social Links */}
              {(hub.socials?.twitter || hub.socials?.instagram || hub.socials?.facebook || hub.socials?.website) && (
                <Card variant="bordered">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                    Social Links
                  </h2>
                  <div className="flex items-center gap-3">
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

            {/* Sidebar */}
            <div className="space-y-6">
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

              {/* Members Card */}
              <HubMembersCard
                members={members}
                isVip={isVip}
                authUser={authUser}
                hubSlug={hub.slug}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

