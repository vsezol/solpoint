import { notFound, redirect } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { Button, Card, Input } from "@/components/ui";
import { Calendar, MapPin, Globe, Ticket, Settings, Users, Save, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Event, User } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { EventEditForm } from "./event-edit-form";
import { EntityMemberCard } from "@/components/cards";
import type { MemberRole } from "@/components/cards";

interface EventEditPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventEditPage({ params }: EventEditPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Проверяем аутентификацию
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/login");
  }

  // Получаем событие по slug
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
        updated_at
      )
    `)
    .eq("slug", slug)
    .single();

  if (eventError || !eventData) {
    notFound();
  }

  const event = {
    ...eventData,
    organizer: eventData.organizer ? {
      ...eventData.organizer,
    } : undefined,
  } as Event & { organizer?: User };

  // Проверяем, является ли пользователь организатором
  if (event.organizer_id !== authUser.id) {
    redirect(`/events/${slug}`);
  }

  // Получаем участников события
  const { data: membersData } = await supabase
    .from("event_attendees")
    .select(`
      *,
      user:profiles!event_attendees_user_id_fkey(
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
        updated_at
      )
    `)
    .eq("event_id", event.id)
    .order("registered_at", { ascending: false });

  const members = (membersData || []).map((m: any) => ({
    ...m.user,
    registered_at: m.registered_at,
  })).filter((u): u is User => u !== null && u !== undefined);

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
                Edit Event
              </h1>
              <p className="text-[var(--color-text-secondary)]">
                Manage your event settings and members
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/events/${slug}`}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Link>
            </Button>
          </div>

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
          </div>

          {/* Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Edit Form */}
              <EventEditForm event={event} />

              {/* Members Section */}
              {members.length > 0 && (
                <Card variant="bordered">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-[var(--color-primary)]" />
                    <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                      Event Members ({members.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Owner/Organizer */}
                    {event.organizer && (
                      <EntityMemberCard
                        user={event.organizer}
                        role="owner"
                        permissions="Full access"
                        isCurrentUser={event.organizer_id === authUser.id}
                      />
                    )}
                    {/* Other Members */}
                    {members
                      .filter((m) => m.id !== event.organizer_id)
                      .slice(0, 5)
                      .map((member) => (
                        <EntityMemberCard
                          key={member.id}
                          user={member}
                          role="member"
                          permissions="-"
                          isCurrentUser={member.id === authUser.id}
                        />
                      ))}
                  </div>
                  {members.length > 6 && (
                    <div className="mt-4 text-center">
                      <Button variant="outline" asChild>
                        <Link href={`/events/${slug}?tab=attendees`}>
                          View all members
                        </Link>
                      </Button>
                    </div>
                  )}
                </Card>
              )}

              {/* Settings */}
              <Card variant="bordered">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-[var(--color-primary)]" />
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                    Settings
                  </h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)] mb-2">Settings options:</p>
                    <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                        Edit description
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                        Event type
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                        Visibility
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                        Registration settings
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                        Location
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Event Info */}
              <Card variant="bordered">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                  Event Information
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-[var(--color-text-muted)] mb-1">Status</p>
                    <p className="text-[var(--color-text-primary)] font-medium">
                      {event.visibility === "public" ? "Public" : "VIP Only"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--color-text-muted)] mb-1">Type</p>
                    <p className="text-[var(--color-text-primary)] font-medium capitalize">
                      {event.event_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--color-text-muted)] mb-1">Attendees</p>
                    <p className="text-[var(--color-text-primary)] font-medium">
                      {event.attendees_count} {event.attendees_count === 1 ? "person" : "people"}
                      {event.max_attendees && ` / ${event.max_attendees} max`}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <Card variant="bordered">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/events/${slug}`}>
                      View Event
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/events/${slug}?action=invite`}>
                      Invite Members
                    </Link>
                  </Button>
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

