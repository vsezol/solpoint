import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header, Footer } from "@/components/layout";
import { Card, Button } from "@/components/ui";
import { Calendar, Users, Briefcase, Globe, ExternalLink, Edit } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Event, Hub, Project, Community } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Проверяем аутентификацию
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/login");
  }

  // Получаем все сущности пользователя напрямую из БД
  const [eventsResult, hubsResult, projectsResult, communitiesResult] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("organizer_id", authUser.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("hubs")
      .select("*")
      .eq("creator_id", authUser.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("*")
      .eq("creator_id", authUser.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("communities")
      .select("*")
      .eq("creator_id", authUser.id)
      .order("created_at", { ascending: false }),
  ]);

  const events = eventsResult.data || [];
  const hubs = hubsResult.data || [];
  const projects = projectsResult.data || [];
  const communities = communitiesResult.data || [];

  const totalCount = events.length + hubs.length + projects.length + communities.length;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">
              Dashboard
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Manage your events, hubs, projects, and communities
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card variant="bordered" className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">Events</p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {events.length}
                  </p>
                </div>
              </div>
            </Card>
            <Card variant="bordered" className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-[var(--color-primary)]" />
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">Hubs</p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {hubs.length}
                  </p>
                </div>
              </div>
            </Card>
            <Card variant="bordered" className="p-4">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-[var(--color-primary)]" />
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">Projects</p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {projects.length}
                  </p>
                </div>
              </div>
            </Card>
            <Card variant="bordered" className="p-4">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-[var(--color-primary)]" />
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">Communities</p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {communities.length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {totalCount === 0 ? (
            <Card variant="bordered" className="p-12 text-center">
              <p className="text-[var(--color-text-secondary)] mb-4">
                You don't have any entities yet.
              </p>
              <Button variant="primary" asChild>
                <Link href="/events">Create your first event</Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Events */}
              {events.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                      <Calendar className="w-6 h-6" />
                      Events ({events.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.map((event: Event) => (
                      <Card key={event.id} variant="bordered" className="overflow-hidden">
                        {event.image_url ? (
                          <div className="relative h-32 w-full">
                            <Image
                              src={event.image_url}
                              alt={event.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-32 w-full bg-gradient-to-br from-[var(--color-primary)]/20 via-[var(--color-primary)]/10 to-[var(--color-secondary)]/20 flex items-center justify-center">
                            <Calendar className="w-12 h-12 text-[var(--color-primary)] opacity-60" />
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start gap-3 mb-2">
                            <Calendar className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                            <h3 className="font-semibold text-[var(--color-text-primary)] truncate flex-1">
                              {event.name}
                            </h3>
                          </div>
                          {event.description && (
                            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3 ml-8">
                              {event.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/dashboard/event/${event.id}/edit`}>
                                <Edit className="w-4 h-4 mr-1" />
                                Manage
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/events/${event.slug}`}>
                                <ExternalLink className="w-4 h-4 mr-1" />
                                View
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* Hubs */}
              {hubs.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                      <Users className="w-6 h-6" />
                      Hubs ({hubs.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hubs.map((hub: Hub) => (
                      <Card key={hub.id} variant="bordered" className="overflow-hidden">
                        {hub.image_url ? (
                          <div className="relative h-32 w-full">
                            <Image
                              src={hub.image_url}
                              alt={hub.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-32 w-full bg-gradient-to-br from-[var(--color-primary)]/20 via-[var(--color-primary)]/10 to-[var(--color-secondary)]/20 flex items-center justify-center">
                            <Users className="w-12 h-12 text-[var(--color-primary)] opacity-60" />
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start gap-3 mb-2">
                            <Users className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                            <h3 className="font-semibold text-[var(--color-text-primary)] truncate flex-1">
                              {hub.name}
                            </h3>
                          </div>
                          {hub.description && (
                            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3 ml-8">
                              {hub.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/dashboard/hub/${hub.id}/edit`}>
                                  <Edit className="w-4 h-4 mr-1" />
                                  Manage
                                </Link>
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/hubs/${hub.slug}`}>
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  View
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* Projects */}
              {projects.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                      <Briefcase className="w-6 h-6" />
                      Projects ({projects.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project: Project) => (
                      <Card key={project.id} variant="bordered" className="overflow-hidden">
                        {project.image_url ? (
                          <div className="relative h-32 w-full">
                            <Image
                              src={project.image_url}
                              alt={project.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-32 w-full bg-gradient-to-br from-[var(--color-primary)]/20 via-[var(--color-primary)]/10 to-[var(--color-secondary)]/20 flex items-center justify-center">
                            <Briefcase className="w-12 h-12 text-[var(--color-primary)] opacity-60" />
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start gap-3 mb-2">
                            <Briefcase className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                            <h3 className="font-semibold text-[var(--color-text-primary)] truncate flex-1">
                              {project.name}
                            </h3>
                          </div>
                          {project.description && (
                            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3 ml-8">
                              {project.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/dashboard/project/${project.id}/edit`}>
                                <Edit className="w-4 h-4 mr-1" />
                                Manage
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/projects/${project.slug}`}>
                                <ExternalLink className="w-4 h-4 mr-1" />
                                View
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* Communities */}
              {communities.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                      <Globe className="w-6 h-6" />
                      Communities ({communities.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {communities.map((community: Community) => (
                      <Card key={community.id} variant="bordered" className="overflow-hidden">
                        {community.image_url ? (
                          <div className="relative h-32 w-full">
                            <Image
                              src={community.image_url}
                              alt={community.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-32 w-full bg-gradient-to-br from-[var(--color-primary)]/20 via-[var(--color-primary)]/10 to-[var(--color-secondary)]/20 flex items-center justify-center">
                            <Globe className="w-12 h-12 text-[var(--color-primary)] opacity-60" />
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start gap-3 mb-2">
                            <Globe className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                            <h3 className="font-semibold text-[var(--color-text-primary)] truncate flex-1">
                              {community.name}
                            </h3>
                          </div>
                          {community.description && (
                            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3 ml-8">
                              {community.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/dashboard/community/${community.id}/edit`}>
                                <Edit className="w-4 h-4 mr-1" />
                                Manage
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/communities/${community.slug}`}>
                                <ExternalLink className="w-4 h-4 mr-1" />
                                View
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

