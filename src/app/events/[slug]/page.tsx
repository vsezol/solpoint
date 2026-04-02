import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { EventBadges, Card } from "@/components/ui";
import { EntityMembersWidget } from "@/components/entities/entity-members-widget";
import { Calendar, MapPin, Globe, Ticket, Link as LinkIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Event, User, ExternalUser } from "@/types";
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

  // Organizers from event_organizers (internal = profiles, external = luma_users)
  let organizersInternal: User[] = [];
  const organizersExternal: ExternalUser[] = [];

  const { data: organizerRows } = await supabase
    .from("event_organizers")
    .select(`
      profile_id,
      luma_user_id,
      position,
      profile:profiles!event_organizers_profile_id_fkey(
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
        countries!fk_profiles_country_code ( name )
      ),
      luma_user:luma_users!event_organizers_luma_user_id_fkey(
        id,
        luma_profile_url,
        name,
        avatar,
        social_links
      )
    `)
    .eq("event_id", eventData.id)
    .order("position", { ascending: true });

  if (organizerRows?.length) {
    for (const row of organizerRows as Array<{
      profile_id: string | null;
      luma_user_id: string | null;
      profile: unknown;
      luma_user: { id: string; luma_profile_url: string; name: string | null; avatar: string | null; social_links: unknown } | unknown[] | null;
    }>) {
      if (row.profile_id && row.profile) {
        const p = Array.isArray(row.profile) ? row.profile[0] : row.profile;
        const pr = p as { countries?: { name: string }[] | { name: string }; country?: string } & User;
        if (pr) {
          const countryName = Array.isArray(pr.countries) ? pr.countries[0]?.name : (pr.countries as { name: string })?.name;
          organizersInternal.push({
            ...pr,
            country: countryName || pr.country,
          } as User);
        }
      }
      if (row.luma_user_id && row.luma_user) {
        const u = Array.isArray(row.luma_user) ? row.luma_user[0] : row.luma_user;
        const lu = u as { id: string; luma_profile_url: string; name: string | null; avatar: string | null; social_links: unknown };
        if (lu)
          organizersExternal.push({
            id: lu.id,
            name: lu.name ?? null,
            avatar: lu.avatar ?? null,
            profile_url: lu.luma_profile_url ?? "",
            social_links: (lu.social_links as Record<string, string>) ?? {},
          });
      }
    }
  }

  // Fallback: if no organizers but event has user owner, show owner as host
  if (organizersInternal.length === 0 && organizersExternal.length === 0 && eventData.owner_type === "user" && eventData.owner_id) {
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
        countries!fk_profiles_country_code ( name )
      `)
      .eq("id", eventData.owner_id)
      .single();
    if (ownerProfile) {
      const countryName = Array.isArray(ownerProfile.countries) ? ownerProfile.countries[0]?.name : (ownerProfile.countries as { name: string })?.name;
      organizersInternal = [{ ...ownerProfile, country: countryName || ownerProfile.country } as User];
    }
  }

  const event: Event = {
    ...eventData,
    source: eventData.luma_event_id ? "external" : "solpoint",
    organizers: { internal: organizersInternal, external: organizersExternal },
  } as Event;

  // Проверяем регистрацию текущего пользователя (только если авторизован)
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
      <EventViewTracker event={event} isVip={isVip} />
      <main className="min-h-screen bg-black pb-16 pt-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="w-full border-x border-white/10 bg-black">
            <div className="grid grid-cols-1 min-[980px]:grid-cols-[minmax(0,58fr)_minmax(0,42fr)] min-[1200px]:grid-cols-[minmax(0,599px)_minmax(0,601px)]">
              <section className="border-b border-white/10 px-6 pb-10 pt-8 sm:px-10 min-[980px]:min-h-[969px] min-[980px]:border-b-0 min-[980px]:border-r min-[980px]:border-r-white/10 min-[980px]:px-8 min-[1200px]:px-[45px]">
                <div className="relative mb-8 h-[220px] overflow-hidden rounded-[6px] border border-white/10 bg-[#121212] sm:h-[280px]">
                  {event.image_url ? (
                    <Image
                      src={event.image_url}
                      alt={event.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Calendar className="h-24 w-24 stroke-[1.5] text-white/45" />
                    </div>
                  )}
                  <div className="absolute left-3 top-3">
                    <EventBadges event={event} />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <h1 className="min-w-0 text-3xl font-semibold text-white sm:text-4xl" style={kodeMonoStyle}>
                      {event.name}
                    </h1>
                    <EventShareButton
                      event={event}
                      variant="outline"
                      className="h-[44px] w-[44px] shrink-0 rounded-[5px] border-white/30 bg-[#121212] px-0 text-white hover:bg-[#2a2a2a]"
                    />
                  </div>

                  <Card variant="bordered" className="rounded-[6px] border-white/10 bg-[#121212] p-5 sm:p-6">
                    <h2 className="mb-5 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
                      event details
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                        <div>
                          <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Date & Time</p>
                          <p className="text-white/90">
                            {formatDate(event.start_date, event.end_date)}
                          </p>
                        </div>
                      </div>

                      {event.is_paid !== undefined && (
                        <div className="flex items-start gap-3">
                          <Ticket className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                          <div>
                            <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Tickets</p>
                            <p className="text-white/90">
                              {event.is_paid ? `${event.price_sol || 0} SOL` : "Free"}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <Globe className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                        <div>
                          <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Visibility</p>
                          <p className="capitalize text-white/90">
                            {event.visibility}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                        <div>
                          <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Location</p>
                          <p className="text-white/90 break-words [overflow-wrap:anywhere]">
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

                      {(event.socials?.twitter || event.socials?.instagram || event.socials?.facebook || event.socials?.website || event.socials?.luma) && (
                        <div className="flex items-start gap-3">
                          <LinkIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#14f195]" />
                          <div>
                            <p className="mb-1 text-sm text-white/55" style={kodeMonoStyle}>Links</p>
                            <div className="flex flex-wrap items-center gap-3">
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

                  {event.description && (
                    <div className="rounded-[6px] border border-white/10 bg-[#121212] p-5 sm:p-6">
                      <h2 className="mb-5 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
                        about
                      </h2>
                      <p className="whitespace-pre-line text-base leading-relaxed text-white/80 sm:text-lg">
                        {event.description}
                      </p>
                    </div>
                  )}

                  {((event.organizers?.internal?.length ?? 0) + (event.organizers?.external?.length ?? 0)) > 0 && (
                    <div>
                      <h2 className="mb-5 uppercase text-[#adaaaa]" style={sectionHeadingStyle}>
                        hosts
                      </h2>
                      <div className="flex flex-wrap gap-4">
                        {event.organizers?.internal?.map((user) => (
                          <div key={user.id} className="w-fit max-w-md">
                            <EventHostCard
                              user={user}
                              isVip={isVip}
                              currentUserId={authUser?.id}
                            />
                          </div>
                        ))}
                        {event.organizers?.external?.map((ext) => (
                          <div key={ext.id} className="w-fit max-w-md">
                            <EventHostCard
                              externalUser={ext}
                              isVip={isVip}
                              currentUserId={authUser?.id}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <aside className="px-6 pb-10 pt-8 sm:px-10 min-[980px]:px-8 min-[1200px]:px-[50px]">
                <div className="mx-auto w-full max-w-[560px] min-[980px]:mx-0">
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
                eventStartAt={event.start_date ?? null}
                eventTimezone={event.timezone ?? null}
                eventLatitude={event.latitude ?? null}
                eventLongitude={event.longitude ?? null}
                isUserRegistered={isUserRegistered}
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
