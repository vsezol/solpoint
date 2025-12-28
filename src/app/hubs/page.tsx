"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Header, Footer } from "@/components/layout";
import { HubCard } from "@/components/cards/hub-card";
import { HubsControls } from "@/components/hubs/hubs-controls";
import { CreateEntityForm } from "@/components/hubs/create-entity-form";
import { Modal, ModalHeader, ModalTitle, ModalContent } from "@/components/ui";
import { Users, Globe, Home } from "lucide-react";
import { getHubs } from "@/lib/api/hubs";
import { getCommunities } from "@/lib/api/communities";
import { getProjects } from "@/lib/api/projects";
import { getWorkspaces } from "@/lib/api/workspaces";
import type { Hub, Community, Project, Workspace, EntityType } from "@/types";
import { useHubsStore } from "@/store/hubs-store";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export default function HubsPage() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createEntityType, setCreateEntityType] = useState<EntityType>("hub");
  const analyticsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  const { searchQuery, entityTypeFilter, sortBy } = useHubsStore();

  // Fetch entities from API
  useEffect(() => {
    isMountedRef.current = true;

    async function fetchEntities() {
      if (!isMountedRef.current) return;

      try {
        setLoading(true);
        setError(null);

        const filters = {
          search: searchQuery.trim() || undefined,
        };

        // Загружаем все типы сущностей параллельно
        const [fetchedHubs, fetchedCommunities, fetchedProjects, fetchedWorkspaces] = await Promise.all([
          getHubs(filters),
          getCommunities(filters),
          getProjects(filters),
          getWorkspaces(filters),
        ]);

        // Проверяем, что компонент еще смонтирован перед обновлением состояния
        if (isMountedRef.current) {
          setHubs(fetchedHubs);
          setCommunities(fetchedCommunities);
          setProjects(fetchedProjects);
          setWorkspaces(fetchedWorkspaces);
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.error("Error fetching entities:", err);
          setError("Failed to load data. Please try again later.");
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }

    // Очищаем предыдущий таймер
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Добавляем небольшую задержку для поиска (debounce)
    // При первой загрузке (пустой searchQuery) загружаем сразу
    fetchTimeoutRef.current = setTimeout(() => {
      fetchEntities();
    }, searchQuery.trim() ? 300 : 0);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      isMountedRef.current = false;
    };
  }, [searchQuery]);

  // Дебаунс для аналитики поиска (500ms)
  useEffect(() => {
    // Очищаем предыдущий таймер
    if (analyticsTimeoutRef.current) {
      clearTimeout(analyticsTimeoutRef.current);
    }

    // Отправляем аналитику только если есть поисковый запрос
    if (searchQuery.trim()) {
      analyticsTimeoutRef.current = setTimeout(() => {
        trackEvent("hub_search", {
          event_category: "Hubs",
          query_length: searchQuery.length,
        });
      }, 500);
    }

    return () => {
      if (analyticsTimeoutRef.current) {
        clearTimeout(analyticsTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Фильтрация и сортировка данных
  const filteredAndSortedEntities = useMemo(() => {
    let entities: (Hub | Community | Project | Workspace)[] = [];

    // Фильтрация по типу
    if (entityTypeFilter === "all") {
      entities = [...hubs, ...communities, ...projects, ...workspaces];
    } else if (entityTypeFilter === "hubs") {
      entities = hubs;
    } else if (entityTypeFilter === "community") {
      entities = communities;
    } else if (entityTypeFilter === "projects") {
      entities = projects;
    } else if (entityTypeFilter === "workspaces") {
      entities = workspaces;
    }

    // Сортировка
    if (sortBy === "name") {
      entities.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "members") {
      entities.sort((a, b) => b.members_count - a.members_count);
    } else if (sortBy === "country") {
      entities.sort((a, b) => a.country.localeCompare(b.country));
    }
    // "recommended" - оставляем как есть (уже отсортировано по members_count)

    return entities;
  }, [hubs, communities, projects, workspaces, entityTypeFilter, sortBy]);

  // Мемоизируем вычисления статистики, чтобы избежать лишних ререндеров
  const { totalMembers, totalCountries } = useMemo(() => {
    const allEntities = [...hubs, ...communities, ...projects, ...workspaces];
    const members = allEntities.reduce((acc, entity) => acc + entity.members_count, 0);
    const countries = new Set(allEntities.map((entity) => entity.country).filter(Boolean)).size;
    return { totalMembers: members, totalCountries: countries };
  }, [hubs, communities, projects, workspaces]);

  const handleAddClick = () => {
    // По умолчанию создаем хаб, но можно расширить для выбора типа
    setCreateEntityType("hub");
    setIsCreateModalOpen(true);
  };

  const handleCreateSuccess = (entity: { id: string; slug: string; type: EntityType }) => {
    setIsCreateModalOpen(false);
    // Перезагружаем данные
    window.location.reload();
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 pb-16 animated-bg">
        {/* Hero */}
        <section className="py-12 text-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 inline-block bg-gradient-to-r from-[#00F58D] to-[#A73EFF] bg-clip-text text-transparent">
            Solana Hubs
          </h1>
            <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-8">
              Connect with local Solana communities and Superteam chapters
              around the world.
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-[var(--color-primary)]">
                  <Users className="w-5 h-5" />
                  <span className="text-2xl font-bold">{totalMembers.toLocaleString()}</span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Total Members
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-[var(--color-secondary)]">
                  <Globe className="w-5 h-5" />
                  <span className="text-2xl font-bold">{totalCountries}</span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Countries
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Controls */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <HubsControls />
        </section>

        {/* Hubs Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {/* Header with filter label and Add button */}
          <div className="flex items-center justify-between w-full mb-6">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
              <h2 className="text-lg sm:text-xl font-semibold text-[var(--color-text-primary)]">
                {entityTypeFilter === "all" 
                  ? "All" 
                  : entityTypeFilter === "hubs" 
                  ? "Hubs" 
                  : entityTypeFilter === "community"
                  ? "Community"
                  : entityTypeFilter === "workspaces"
                  ? "Workspaces"
                  : "Projects"}
              </h2>
            </div>
            <button
              onClick={handleAddClick}
              className={cn(
                "px-3 py-1.5 sm:px-6 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors",
                "bg-[var(--color-primary)] text-[var(--color-background)]",
                "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
              )}
            >
              <span className="hidden sm:inline">Add your hub, community, or project</span>
              <span className="sm:hidden">Add hub/community/project</span>
            </button>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-[var(--color-surface)] rounded-lg p-6 animate-pulse"
                >
                  <div className="h-4 bg-[var(--color-surface-border)] rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-[var(--color-surface-border)] rounded w-full mb-2"></div>
                  <div className="h-3 bg-[var(--color-surface-border)] rounded w-5/6"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-error)] mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-background)] rounded-lg hover:opacity-90 transition-opacity"
              >
                Try again
              </button>
            </div>
          ) : filteredAndSortedEntities.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedEntities.map((entity) => {
                // Проверяем тип сущности и рендерим соответствующую карточку
                if ("slug" in entity && "members_count" in entity) {
                  // Определяем тип сущности для правильного пути
                  let entityType: "hub" | "community" | "workspace" | undefined = undefined;
                  
                  if (entityTypeFilter === "community") {
                    entityType = "community";
                  } else if (entityTypeFilter === "workspaces") {
                    entityType = "workspace";
                  } else if (entityTypeFilter === "hubs") {
                    entityType = "hub";
                  } else if (entityTypeFilter === "all") {
                    // Определяем по ID, в каком массиве находится сущность
                    if (communities.some(c => c.id === entity.id)) {
                      entityType = "community";
                    } else if (workspaces.some(w => w.id === entity.id)) {
                      entityType = "workspace";
                    } else if (hubs.some(h => h.id === entity.id)) {
                      entityType = "hub";
                    }
                  }
                  
                  // HubCard поддерживает все эти типы
                  return <HubCard key={entity.id} hub={entity as Hub | Community | Workspace} entityType={entityType} />;
                }
                return null;
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" />
              <p className="text-[var(--color-text-secondary)]">
                {searchQuery.trim()
                  ? "No entities found for your query"
                  : "No entities found"}
              </p>
            </div>
          )}
        </section>
      </main>
      <Footer />

      {/* Create Entity Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        size="xl"
        variant="centered"
      >
        <ModalHeader>
          <ModalTitle>Create Hub, Community, Project, or Workspace</ModalTitle>
        </ModalHeader>
        <ModalContent>
          {/* Entity Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Select Type <span className="text-[var(--color-error)]">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setCreateEntityType("hub")}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  createEntityType === "hub"
                    ? "bg-[var(--color-primary)] text-[var(--color-background)] border-[var(--color-primary)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-surface-border)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                Hub
              </button>
              <button
                type="button"
                onClick={() => setCreateEntityType("community")}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  createEntityType === "community"
                    ? "bg-[var(--color-primary)] text-[var(--color-background)] border-[var(--color-primary)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-surface-border)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                Community
              </button>
              <button
                type="button"
                onClick={() => setCreateEntityType("project")}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  createEntityType === "project"
                    ? "bg-[var(--color-primary)] text-[var(--color-background)] border-[var(--color-primary)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-surface-border)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                Project
              </button>
              <button
                type="button"
                onClick={() => setCreateEntityType("workspace")}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  createEntityType === "workspace"
                    ? "bg-[var(--color-primary)] text-[var(--color-background)] border-[var(--color-primary)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-surface-border)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                Workspace
              </button>
            </div>
          </div>
          <CreateEntityForm
            entityType={createEntityType}
            onSuccess={handleCreateSuccess}
            onCancel={() => setIsCreateModalOpen(false)}
          />
        </ModalContent>
      </Modal>
    </>
  );
}

