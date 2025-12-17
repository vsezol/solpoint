import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Avatar, Button, Badge, Card } from "@/components/ui";
import {
  Calendar,
  Crown,
  MessageCircle,
  MapPin,
  Users,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { User, Event } from "@/types";
import { ProfileInfoSection } from "../profile-info-section";
import { ProfileHeader } from "../profile-header";
import { ProfileEditProvider } from "../profile-edit-provider";
import { ProfileMainSection } from "../profile-main-section";
import { ProfileSidebar } from "../profile-sidebar";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const supabase = await createClient();

  // Получаем текущего пользователя для проверки, это его профиль или нет
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Получаем профиль пользователя по никнейму (может быть свой или чужой)
  // Убираем @ если он есть в начале
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
  
  // Получаем профиль по точному совпадению twitter_handle с названием страны
  const { data: user, error: profileError } = await supabase
    .from("profiles")
    .select(`
      *,
      countries!fk_profiles_country_code (
        name
      )
    `)
    .eq("twitter_handle", cleanUsername)
    .maybeSingle();

  // Если пользователь не найден или ошибка
  if (profileError || !user) {
    notFound();
  }

  const isOwnProfile = authUser?.id === user.id;

  // Получаем события пользователя (для любого профиля)
  let upcomingEvents: Event[] = [];
  let pastEvents: Event[] = [];
  let allUpcomingEvents: Event[] = []; // Все предстоящие события для блока "What's happening"
  let friends: User[] = [];
  let friendshipStatus: "none" | "pending_sent" | "pending_received" | "accepted" | "blocked" = "none";

  // Получаем события пользователя
  const { data: eventAttendees } = await supabase
    .from("event_attendees")
    .select(
      `
      event_id,
      events (
        id,
        name,
        description,
        image_url,
        country,
        country_code,
        city,
        address,
        latitude,
        longitude,
        start_date,
        end_date,
        event_type,
        visibility,
        is_paid,
        price_sol,
        max_attendees,
        attendees_count,
        socials,
        organizer_id,
        slug,
        created_at
      )
    `
    )
    .eq("user_id", user.id);

  const allEvents: Event[] =
    eventAttendees?.map((ea: any) => {
      const event = Array.isArray(ea.events) ? ea.events[0] : ea.events;
      return event;
    }).filter((e: any): e is Event => Boolean(e)) || [];

  const now = new Date();
  upcomingEvents = allEvents.filter((e) => new Date(e.start_date) > now);
  pastEvents = allEvents.filter((e) => new Date(e.start_date) <= now);

  // Получаем все предстоящие события для блока "What's happening" (только для своего профиля)
  if (isOwnProfile) {
    const { data: allEventsData } = await supabase
      .from("events")
      .select("*")
      .gte("start_date", now.toISOString())
      .order("start_date", { ascending: true })
      .limit(10);

    allUpcomingEvents = (allEventsData || []) as Event[];
  }

  // Получаем друзей пользователя (только для своего профиля)
  if (isOwnProfile && authUser) {
    const { data: friendsData } = await supabase
      .from("friends")
      .select(
        `
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
      `
      )
      .eq("user_id", authUser.id)
      .eq("status", "accepted");

    friends =
      friendsData?.map((f: any) => {
        const profile = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles;
        return profile;
      }).filter((p: any): p is User => Boolean(p)) || [];
  }

  // Получаем статус дружбы для чужого профиля
  if (!isOwnProfile && authUser) {
    const { data: friendship } = await supabase
      .from("friends")
      .select("*")
      .or(`and(user_id.eq.${authUser.id},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${authUser.id})`)
      .maybeSingle();

    if (friendship) {
      if (friendship.status === "accepted") {
        friendshipStatus = "accepted";
      } else if (friendship.status === "pending") {
        if (friendship.user_id === authUser.id) {
          friendshipStatus = "pending_sent";
        } else {
          friendshipStatus = "pending_received";
        }
      } else if (friendship.status === "blocked") {
        friendshipStatus = "blocked";
      }
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          {isOwnProfile ? (
            <ProfileEditProvider>
              {/* Main flex container - row */}
              <div className="flex flex-row gap-6 items-start">
                {/* Left column - Profile */}
                <div className="flex-1 min-w-0 max-w-[600px]">
                  <ProfileMainSection 
                    user={user} 
                    isOwnProfile={isOwnProfile} 
                    friendsCount={friends.length}
                  />
                </div>

                {/* Right column - Sidebar */}
                <div className="w-80 flex-shrink-0">
                  <ProfileSidebar 
                    user={user} 
                    upcomingEvents={allUpcomingEvents}
                  />
                </div>
              </div>
            </ProfileEditProvider>
          ) : (
            <>
              {/* Profile header */}
              <div className="relative -mt-16 mb-8">
                <ProfileHeader user={user} isOwnProfile={isOwnProfile} friendshipStatus={friendshipStatus} />
              </div>

              {/* Content grid */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Left column - Info */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Bio */}
                  <Card variant="bordered">
                    <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">
                      About
                    </h3>
                    <p className="text-[var(--color-text-secondary)]">
                      {user.bio || "No bio yet"}
                    </p>
                  </Card>

                  {/* Details */}
                  <Card variant="bordered">
                    <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
                      Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
                        <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
                        <span>
                          {user.city && `${user.city}, `}
                          {(user as User & { countries?: { name: string } })?.countries?.name || user.country || "Not specified"}
                        </span>
                      </div>
                      {user.role && (
                        <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
                          <Users className="w-4 h-4 text-[var(--color-primary)]" />
                          <span className="capitalize">{user.role}</span>
                        </div>
                      )}
                      {user.is_open_to_meet && (
                        <Badge variant="success">Open to meet</Badge>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Right column - Activity */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Upcoming Events */}
                  <Card variant="bordered">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-[var(--color-text-primary)]">
                        Upcoming Events
                      </h3>
                      {upcomingEvents.length > 0 && (
                        <Link
                          href="/events"
                          className="text-sm text-[var(--color-primary)] hover:underline"
                        >
                          View all
                        </Link>
                      )}
                    </div>
                    {upcomingEvents.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingEvents.slice(0, 2).map((event) => (
                          <Link
                            key={event.id}
                            href={`/events/${(event as Event & { slug?: string }).slug || event.id}`}
                            className="block"
                          >
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-hover)]/80 transition-colors">
                              <div className="w-12 h-12 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-[var(--color-primary)]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[var(--color-text-primary)] truncate">
                                  {event.name}
                                </p>
                                <p className="text-xs text-[var(--color-text-muted)]">
                                  {new Date(event.start_date).toLocaleDateString()} •{" "}
                                  {event.city}
                                </p>
                              </div>
                              <Badge variant="primary" size="sm">
                                {event.event_type}
                              </Badge>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-[var(--color-text-muted)] py-4">
                        No upcoming events
                      </p>
                    )}
                  </Card>

                  {/* Past Events */}
                  <Card variant="bordered">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-[var(--color-text-primary)]">
                        Past Events
                      </h3>
                    </div>
                    {pastEvents.length > 0 ? (
                      <div className="space-y-3">
                        {pastEvents.slice(0, 2).map((event) => (
                          <Link
                            key={event.id}
                            href={`/events/${(event as Event & { slug?: string }).slug || event.id}`}
                            className="block"
                          >
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-hover)] opacity-70 hover:opacity-100 transition-opacity">
                              <div className="w-12 h-12 rounded-lg bg-[var(--color-surface-border)] flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-[var(--color-text-muted)]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[var(--color-text-primary)] truncate">
                                  {event.name}
                                </p>
                                <p className="text-xs text-[var(--color-text-muted)]">
                                  {new Date(event.start_date).toLocaleDateString()} •{" "}
                                  {event.city}
                                </p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-[var(--color-text-muted)] py-4">
                        No past events
                      </p>
                    )}
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

