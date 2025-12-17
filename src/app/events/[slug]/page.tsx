import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button, EventBadges, Card, AttendeesList } from "@/components/ui";
import { Calendar, MapPin, Share2, ExternalLink, Twitter, Instagram, Facebook, Globe, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Event, User, EventMember } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { UserCard } from "@/components/cards/user-card";
import { AttendButton } from "./attend-button";

interface EventPageProps {
  params: Promise<{ slug: string }>;
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

  // Получаем событие по slug с организатором
  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select(`
      *,
      organizer:profiles!events_organizer_id_fkey(
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
    .eq("slug", slug)
    .single();

  if (eventError || !eventData) {
    notFound();
  }

  // Проверяем доступ к VIP событию
  if (eventData.visibility === "vip_only" && !isVip) {
    notFound();
  }

  // Преобразуем данные события
  const event = {
    ...eventData,
    organizer: eventData.organizer ? {
      ...eventData.organizer,
      countries: eventData.organizer.countries,
    } : undefined,
  } as Event & { organizer?: User & { countries?: { name: string } } };

  const organizer = event.organizer ? {
    ...event.organizer,
    country: (event.organizer as User & { countries?: { name: string } }).countries?.name || event.organizer.country,
  } as User : undefined;

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
      .single();

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

    // Получаем друзей авторизованного пользователя
    const { data: friendsData } = await supabase
      .from("friends")
      .select(`
        friend_id,
        profiles!friends_friend_id_fkey (
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
      .eq("user_id", authUser.id)
      .eq("status", "accepted");

    friends = (friendsData?.map((f: { friend_id: string; profiles: User | User[] | null }) => {
      if (Array.isArray(f.profiles)) {
        return f.profiles[0] || null;
      }
      return f.profiles;
    }).filter((p): p is User => p !== null) || []) as User[];

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
                <Button variant="ghost" size="sm">
                  <Share2 className="w-5 h-5" />
                </Button>
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
                </div>
              </Card>

              {/* Host Card */}
              {organizer && (
                <div>
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                    Hosts
                  </h2>
                  <div className="w-fit max-w-md">
                    <UserCard
                      user={organizer}
                      isHost={true}
                      isVip={isVip}
                      compact={false}
                    />
                  </div>
                </div>
              )}

           

              {/* Social Links */}
              {(event.socials?.twitter || event.socials?.instagram || event.socials?.facebook || event.socials?.website) && (
                <Card variant="bordered">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                    Social Links
                  </h2>
                  <div className="flex items-center gap-3">
                    {event.socials?.twitter && (
                      <a
                        href={event.socials.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                      >
                        <Twitter className="w-5 h-5" />
                      </a>
                    )}
                    {event.socials?.instagram && (
                      <a
                        href={event.socials.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                      >
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {event.socials?.facebook && (
                      <a
                        href={event.socials.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                      >
                        <Facebook className="w-5 h-5" />
                      </a>
                    )}
                    {event.socials?.website && (
                      <a
                        href={event.socials.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Register Card */}
              <Card variant="bordered">
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
                  <Button variant="outline" className="w-full">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Event
                  </Button>
                </div>
              </Card>

              {/* Attendees Card */}
              <Card variant="bordered">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                  Attendees
                </h3>
                <div className="space-y-6">
                  {/* All Attendees */}
                  <AttendeesList
                    title={`${event.attendees_count} ${event.attendees_count === 1 ? "person" : "people"} going`}
                    items={members
                      .filter((m) => m.user)
                      .map((m) => ({
                        id: m.user!.id,
                        avatar_url: m.user!.avatar_url,
                        name: m.user!.twitter_name,
                        twitter_handle: m.user!.twitter_handle,
                        isVip: m.user!.subscription_tier === "vip",
                        isVerified: m.user!.is_verified,
                      }))}
                    showAllText="Show all attendees"
                    showAllHref={`/events/${event.slug}?tab=attendees`}
                    capacityInfo={
                      event.max_attendees
                        ? `${event.max_attendees - (event.attendees_count || 0)} spots left`
                        : "Unlimited spots left"
                    }
                    emptyText="No attendees yet"
                  />

                  {/* Friends Going */}
                  {authUser && (
                    <AttendeesList
                      title={`${userFriendsGoing.length} ${userFriendsGoing.length === 1 ? "friend" : "friends"} going`}
                      items={userFriendsGoing.map((friend) => ({
                        id: friend.id,
                        avatar_url: friend.avatar_url,
                        name: friend.twitter_name,
                        twitter_handle: friend.twitter_handle,
                        isVip: friend.subscription_tier === "vip",
                        isVerified: friend.is_verified,
                      }))}
                      showAllText="Show all friends"
                      showAllHref={`/events/${event.slug}?tab=attendees`}
                      ctaButtonText="Invite friends to this event"
                      ctaButtonHref={`/events/${event.slug}?action=invite`}
                      emptyText="No friends going yet"
                    />
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

