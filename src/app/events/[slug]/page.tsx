import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { EventBadges, Card } from "@/components/ui";
import { Calendar, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Event, User, EventMember } from "@/types";
import Image from "next/image";
import type { Metadata } from "next";
import { getAppUrl } from "@/lib/utils";
import { EventViewTracker } from "@/components/analytics/event-view-tracker";
import { EventShareButton } from "@/components/analytics/event-share-button";
import { EventSocialLink } from "@/components/analytics/event-social-link";
import { TeamSection } from "@/components/entities/team-section";
import { MembersSidebar } from "@/components/entities/members-sidebar";

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  // Получаем событие для метаданных
  const { data: eventData } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!eventData) {
    return {
      title: "Event Not Found",
    };
  }

  const event = eventData as Event;
  const appUrl = getAppUrl();
  const eventUrl = `${appUrl}/events/${slug}`;
  // Используем картинку события, если она есть, иначе логотип
  const imageUrl = event.image_url && event.image_url.trim() !== ''
    ? (event.image_url.startsWith('http://') || event.image_url.startsWith('https://'))
      ? event.image_url
      : `${appUrl}${event.image_url.startsWith('/') ? '' : '/'}${event.image_url}`
    : `${appUrl}/logo.svg`;
  
  // Форматируем дату для описания
  const formatDate = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const startStr = start.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (!endDate) {
      const timeStr = start.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${startStr} ${timeStr}`;
    }

    const end = new Date(endDate);
    const endStr = end.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const endTimeStr = end.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const startTimeStr = start.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${startStr} ${startTimeStr} - ${endStr} ${endTimeStr}`;
  };

  const location = event.venue_name 
    ? `${event.venue_name}, ${event.city}, ${event.country}`
    : `${event.city}, ${event.country}`;
  
  const description = event.description 
    ? `${event.description} | ${formatDate(event.start_date, event.end_date)} | ${location}`
    : `${formatDate(event.start_date, event.end_date)} | ${location}`;

  return {
    title: `${event.name} | SolPoint`,
    description: description,
    openGraph: {
      title: event.name,
      description: description,
      type: "website",
      url: eventUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: event.name,
        },
      ],
      siteName: "SolPoint",
    },
    twitter: {
      card: "summary_large_image",
      title: event.name,
      description: description,
      images: [imageUrl],
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
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

  // Получаем событие по slug (без join'ов для надежности)
  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (eventError || !eventData) {
    notFound();
  }

  // Проверяем доступ к VIP событию
  if (eventData.visibility === "vip_only" && !isVip) {
    notFound();
  }

  const event = eventData as Event;

  // Получаем hosts (owners и moderators) из event_roles
  let hosts: (User & { role?: "owner" | "moderator" })[] = [];
  if (authUser) {
    const { data: eventRolesData } = await supabase
      .from("event_roles")
      .select(`
        role,
        user:profiles!event_roles_user_id_fkey(
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
      .eq("event_id", event.id)
      .in("role", ["owner", "moderator"]);

    hosts = (eventRolesData || []).map((er: any) => {
      const user = Array.isArray(er.user) ? er.user[0] : er.user;
      const countryName = Array.isArray(user?.countries) 
        ? user.countries[0]?.name 
        : (user?.countries as { name: string } | null | undefined)?.name;
      return {
        ...user,
        country: countryName || user?.country,
        role: er.role,
      };
    }).filter((h): h is User & { role?: "owner" | "moderator" } => h !== null && h !== undefined);
  }

  // Получаем участников события (attendees) (только если авторизован)
  let attendees: User[] = [];
  let friends: User[] = [];
  let isUserRegistered = false;

  if (authUser) {
    // Проверяем, зарегистрирован ли пользователь на событие
    const { data: userMember } = await supabase
      .from("event_members")
      .select("id, status")
      .eq("event_id", event.id)
      .eq("user_id", authUser.id)
      .maybeSingle(); // Используем maybeSingle() вместо single() чтобы не было ошибки если записи нет

    isUserRegistered = userMember?.status === "going";

    // Получаем участников события
    const { data: membersData } = await supabase
      .from("event_members")
      .select(`
        *,
        user:profiles!event_members_user_id_fkey(
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
      .eq("event_id", event.id)
      .eq("status", "going")
      .order("registered_at", { ascending: false })
      .limit(20);

    // Преобразуем EventMember в User[]
    attendees = (membersData || [])
      .map((m: any) => {
        const user = Array.isArray(m.user) ? m.user[0] : m.user;
        if (!user) return null;
        const countryName = Array.isArray(user.countries) 
          ? user.countries[0]?.name 
          : (user.countries as { name: string } | null | undefined)?.name;
        return {
          ...user,
          country: countryName || user.country,
        };
      })
      .filter((u): u is User => u !== null);

    // Получаем взаимных друзей авторизованного пользователя
    const { data: mutualFriendsData } = await supabase
      .from("mutual_friends")
      .select("user_id, friend_id")
      .or(`user_id.eq.${authUser.id},friend_id.eq.${authUser.id}`);

    // Получаем ID всех друзей
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

    // Находим друзей, которые идут на событие
    if (friendIds.length > 0) {
      const attendeeUserIds = new Set(attendees.map(a => a.id));
      const friendAttendeeIds = friendIds.filter(id => attendeeUserIds.has(id));

      if (friendAttendeeIds.length > 0) {
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
          .in("id", friendAttendeeIds);

        friends = (friendsProfiles || []).map((f: any) => {
          const countryName = Array.isArray(f.countries) 
            ? f.countries[0]?.name 
            : (f.countries as { name: string } | null | undefined)?.name;
          return {
            ...f,
            country: countryName || f.country,
          };
        }) as User[];
      }
    }
  }

  const formatDate = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const startStr = start.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (!endDate) {
      const timeStr = start.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${startStr} ${timeStr}`;
    }

    const end = new Date(endDate);
    const endStr = end.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const endTimeStr = end.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const startTimeStr = start.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${startStr} ${startTimeStr} - ${endStr} ${endTimeStr}`;
  };


  return (
    <>
      <Header />
      <EventViewTracker event={event} isVip={isVip} />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <div className="relative h-64 md:h-96 rounded-xl overflow-hidden mb-8 bg-gradient-to-br from-[var(--color-primary)]/20 via-[var(--color-primary)]/10 to-[var(--color-secondary)]/20">
            {event.image_url ? (
              <Image
                src={event.image_url}
                alt={event.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Calendar className="w-24 h-24 text-[var(--color-text-primary)] opacity-60 stroke-[1.5]" />
              </div>
            )}
            <div className="absolute top-4 left-4">
              <EventBadges event={event} />
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-4">
                    {event.name}
                  </h1>
                  {event.description && (
                    <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                      {event.description}
                    </p>
                  )}
                </div>
                <EventShareButton event={event} />
              </div>

              {/* Event Description */}
              {event.description && (
                <Card variant="bordered">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                    Event description
                  </h2>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed">
                    {event.description}
                  </p>
                </Card>
              )}

              {/* Location */}
              <Card variant="bordered">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                  <div>
                    {event.venue_name && (
                      <p className="text-[var(--color-text-primary)] font-semibold mb-1">
                        {event.venue_name}
                      </p>
                    )}
                    {event.address && (
                      <p className="text-[var(--color-text-primary)] mb-1">
                        {event.address}
                      </p>
                    )}
                    <p className="text-[var(--color-text-primary)]">
                      {event.city}, {event.country}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Social Links */}
              {(event.socials?.twitter || event.socials?.instagram || event.socials?.facebook || event.socials?.website) && (
                <Card variant="bordered">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                    Socials
                  </h2>
                  <div className="flex items-center gap-3">
                    {event.socials?.twitter && (
                      <EventSocialLink
                        event={event}
                        platform="twitter"
                        href={event.socials.twitter}
                      />
                    )}
                    {event.socials?.instagram && (
                      <EventSocialLink
                        event={event}
                        platform="instagram"
                        href={event.socials.instagram}
                      />
                    )}
                    {event.socials?.facebook && (
                      <EventSocialLink
                        event={event}
                        platform="facebook"
                        href={event.socials.facebook}
                      />
                    )}
                    {event.socials?.website && (
                      <EventSocialLink
                        event={event}
                        platform="website"
                        href={event.socials.website}
                      />
                    )}
                  </div>
                </Card>
              )}

              {/* Hosts Section */}
              <TeamSection
                teamMembers={hosts}
                isVip={isVip}
                currentUserId={authUser?.id}
                entityType="event"
                title="Hosts"
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Attendees Sidebar */}
              <MembersSidebar
                members={attendees}
                friends={friends}
                isVip={isVip}
                authUser={authUser}
                entitySlug={event.slug}
                entityType="event"
                membersCount={event.attendees_count}
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

