import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { EventBadges, Card } from "@/components/ui";
import { EntityMembersWidget } from "@/components/entities/entity-members-widget";
import { Calendar, MapPin, Globe, Ticket, Link as LinkIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Event, User, EventMember } from "@/types";
import Image from "next/image";
import { EventHostCard } from "./event-host-card";
import type { Metadata } from "next";
import { getAppUrl, isUUID } from "@/lib/utils";
import { EventViewTracker } from "@/components/analytics/event-view-tracker";
import { EventShareButton } from "@/components/analytics/event-share-button";
import { EventSocialLink } from "@/components/analytics/event-social-link";
import { LumaAttendButtonWrapper } from "./luma-attend-button-wrapper";

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  // Получаем событие для метаданных - сначала по слагу, потом по ID
  let query = supabase
    .from("events")
    .select("*");

  if (isUUID(slug)) {
    query = query.eq("id", slug);
  } else {
    query = query.eq("slug", slug);
  }

  const { data: eventData } = await query.single();

  if (!eventData) {
    return {
      title: "Event Not Found",
    };
  }

  const event = eventData as Event;
  const appUrl = getAppUrl();
  // Используем слаг из базы данных для URL, если он есть
  const eventUrl = `${appUrl}/events/${event.slug || slug}`;
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

  // Получаем событие - сначала по слагу, потом по ID (если параметр является UUID)
  let query = supabase
    .from("events")
    .select("*");

  if (isUUID(slug)) {
    query = query.eq("id", slug);
  } else {
    query = query.eq("slug", slug);
  }

  const { data: eventData, error: eventError } = await query.single();

  if (eventError || !eventData) {
    notFound();
  }

  // Проверяем доступ к VIP событию
  if (eventData.visibility === "vip_only" && !isVip) {
    notFound();
  }

  // Опционально получаем organizer только если owner_type = 'user'
  let organizer: User | undefined;
  if (eventData.owner_type === "user" && eventData.owner_id) {
    const { data: ownerProfile } = await supabase
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
      .eq("id", eventData.owner_id)
      .single();

    if (ownerProfile) {
      const countryName = Array.isArray(ownerProfile.countries) 
        ? ownerProfile.countries[0]?.name 
        : (ownerProfile.countries as { name: string } | null | undefined)?.name;
      
      organizer = {
        ...ownerProfile,
        country: countryName || ownerProfile.country,
      } as User;
    }
  }

  const event = eventData as Event;

  // Получаем участников события (только если авторизован)
  let members: (EventMember & { user?: User })[] = [];
  let friends: User[] = [];
  let userFriendsGoing: User[] = [];
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

    members = (membersData || []) as (EventMember & { user?: User })[];

    // Получаем взаимных друзей авторизованного пользователя
    // mutual_friends view содержит записи где user_id < friend_id, поэтому нужно проверять обе стороны
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

    // Загружаем профили друзей
    if (friendIds.length > 0) {
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
        .in("id", friendIds);

      friends = (friendsProfiles || []) as User[];
    }

    // Находим друзей, которые идут на событие
    const memberUserIds = new Set(members.map(m => m.user?.id).filter(Boolean));
    userFriendsGoing = friends.filter(f => memberUserIds.has(f.id));
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

                 {/* Details Card */}
                 <Card variant="bordered">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                  Event Details
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)] mb-1">Date & Time</p>
                      <p className="text-[var(--color-text-primary)]">
                        {formatDate(event.start_date, event.end_date)}
                      </p>
                    </div>
                  </div>

                  {event.is_paid !== undefined && (
                    <div className="flex items-start gap-3">
                      <Ticket className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-[var(--color-text-muted)] mb-1">Tickets</p>
                        <p className="text-[var(--color-text-primary)]">
                          {event.is_paid ? `${event.price_sol || 0} SOL` : "Free"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)] mb-1">Visibility</p>
                      <p className="text-[var(--color-text-primary)] capitalize">
                        {event.visibility}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)] mb-1">Location</p>
                      <p className="text-[var(--color-text-primary)]">
                        {event.venue_name && (
                          <>
                            <span className="font-semibold">{event.venue_name}</span>
                            <br />
                          </>
                        )}
                        {event.address && (
                          <>
                            {event.address}
                            <br />
                          </>
                        )}
                        {event.city}, {event.country}
                      </p>
                    </div>
                  </div>

                  {/* Social Links */}
                  {(event.socials?.twitter || event.socials?.instagram || event.socials?.facebook || event.socials?.website || event.socials?.luma) && (
                    <div className="flex items-start gap-3">
                      <LinkIcon className="w-5 h-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-[var(--color-text-muted)] mb-1">Links</p>
                        <div className="flex items-center gap-3 flex-wrap">
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
                          {event.socials?.luma && (
                            <EventSocialLink
                              event={event}
                              platform="luma"
                              href={event.socials.luma}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Attend/Buy Tickets Button */}
                <div className="mt-6">
                  <LumaAttendButtonWrapper
                    eventSlug={event.slug || slug}
                    lumaLink={event.luma_link}
                    isPaid={event.is_paid || false}
                    isRegistered={isUserRegistered}
                    priceSol={event.price_sol}
                  />
                </div>
              </Card>

              {/* Host Card */}
              {organizer && (
                <div>
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                    Hosts
                  </h2>
                  <div className="w-fit max-w-md">
                    <EventHostCard
                      user={organizer}
                      isVip={isVip}
                      currentUserId={authUser?.id}
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Register Card */}
              {/* TODO: Temporarily commented out - join/attend functionality */}
              {/* <Card variant="bordered">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                      Join the Event
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Register to attend this event and connect with other participants.
                    </p>
                  </div>
                  {authUser ? (
                    <AttendButton
                      eventId={event.id}
                      eventSlug={event.slug}
                      eventName={event.name}
                      eventType={event.event_type}
                      isRegistered={isUserRegistered}
                      isPaid={event.is_paid}
                      priceSol={event.price_sol}
                    />
                  ) : (
                    <Button variant="primary" className="w-full" size="lg" asChild>
                      <Link href="/login">
                        {event.is_paid ? `Buy Tickets - ${event.price_sol} SOL` : "Register Now"}
                      </Link>
                    </Button>
                  )}
                  <EventShareButton 
                    event={event} 
                    variant="outline" 
                    size="lg"
                    className="w-full"
                  />
                </div>
              </Card> */}

              {/* Attendees Widget */}
              <EntityMembersWidget
                entityType="event"
                entityId={event.id}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

