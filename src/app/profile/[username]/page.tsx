import { redirect, notFound } from "next/navigation";
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
  
  // Получаем профиль по точному совпадению twitter_handle
  const { data: user, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("twitter_handle", cleanUsername)
    .maybeSingle();

  // Если пользователь не найден или ошибка
  if (profileError || !user) {
    notFound();
  }

  const isOwnProfile = authUser?.id === user.id;

  // Если это свой профиль, получаем события и друзей
  let upcomingEvents: Event[] = [];
  let pastEvents: Event[] = [];
  let friends: User[] = [];

  if (isOwnProfile && authUser) {
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
          created_at
        )
      `
      )
      .eq("user_id", authUser.id);

    const allEvents: Event[] =
      eventAttendees?.map((ea: any) => ea.events).filter(Boolean) || [];

    const now = new Date();
    upcomingEvents = allEvents.filter((e) => new Date(e.start_date) > now);
    pastEvents = allEvents.filter((e) => new Date(e.start_date) <= now);

    // Получаем друзей пользователя
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
          city,
          role,
          is_open_to_meet,
          subscription_tier,
          is_verified,
          wallet_address,
          socials,
          last_active_at,
          created_at,
          updated_at
        )
      `
      )
      .eq("user_id", authUser.id)
      .eq("status", "accepted");

    friends =
      friendsData?.map((f: any) => f.profiles).filter(Boolean) || [];
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        {/* Hero / Cover */}
        <div className="h-48 bg-gradient-to-r from-[var(--color-primary)]/20 via-[var(--color-secondary)]/20 to-[var(--color-accent)]/20" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {isOwnProfile ? (
            <ProfileEditProvider>
              {/* Profile header */}
              <div className="relative -mt-16 mb-8">
                <ProfileHeader user={user} isOwnProfile={isOwnProfile} />
              </div>

              {/* Content grid */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Left column - Info */}
                <ProfileInfoSection user={user} isOwnProfile={isOwnProfile} friends={friends} />

                {/* Right column - Activity */}
                <div className="lg:col-span-2 space-y-6">
              {/* Subscription status - только для своего профиля */}
              {isOwnProfile && user.subscription_tier === "free" && (
                <Card
                  variant="bordered"
                  className="bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-secondary)]/10"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
                        Upgrade to VIP
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        See cities, profiles, send messages, and more
                      </p>
                    </div>
                    <Button asChild>
                      <Link href="/subscription">
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade
                      </Link>
                    </Button>
                  </div>
                </Card>
              )}

              {/* Friends - только для своего профиля */}
              {isOwnProfile && friends.length > 0 && (
                <Card variant="bordered">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">
                      Friends
                    </h3>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {friends.length} {friends.length === 1 ? "friend" : "friends"}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {friends.slice(0, 4).map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-hover)]"
                      >
                        <Avatar
                          src={friend.avatar_url}
                          alt={friend.twitter_name}
                          size="sm"
                          isVip={friend.subscription_tier === "vip"}
                        />
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/profile/${friend.twitter_handle}`}
                            className="block"
                          >
                            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate hover:underline">
                              {friend.twitter_name}
                            </p>
                          </Link>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">
                            {friend.city && `${friend.city}, `}
                            {friend.country}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Upcoming Events - только для своего профиля */}
              {isOwnProfile && (
                <Card variant="bordered">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">
                      Upcoming Events
                    </h3>
                    <Link
                      href="/events"
                      className="text-sm text-[var(--color-primary)] hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                  {upcomingEvents.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-hover)]"
                        >
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
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-[var(--color-text-muted)] py-4">
                      No upcoming events
                    </p>
                  )}
                </Card>
              )}

              {/* Past Events - только для своего профиля */}
              {isOwnProfile && (
                <Card variant="bordered">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">
                      Past Events
                    </h3>
                  </div>
                  {pastEvents.length > 0 ? (
                    <div className="space-y-3">
                      {pastEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-hover)] opacity-70"
                        >
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
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-[var(--color-text-muted)] py-4">
                      No past events
                    </p>
                  )}
                </Card>
                )}
                </div>
              </div>
            </ProfileEditProvider>
          ) : (
            <>
              {/* Profile header */}
              <div className="relative -mt-16 mb-8">
                <ProfileHeader user={user} isOwnProfile={isOwnProfile} />
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
                          {user.country}
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

                {/* Right column - Activity - пусто для чужих профилей */}
                <div className="lg:col-span-2"></div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

