"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Header, Footer } from "@/components/layout";
import { HubCard } from "@/components/cards/hub-card";
import { HubsControls } from "@/components/hubs/hubs-controls";
import { CreateEntityForm } from "@/components/hubs/create-entity-form";
import { Modal, ModalHeader, ModalTitle, ModalContent, ProSubscriptionModal } from "@/components/ui";
import { AuthRequiredModal } from "@/components/ui/auth-required-modal";
import { Users, Globe, Home } from "lucide-react";
import { getHubs } from "@/lib/api/hubs";
import { getCommunities } from "@/lib/api/communities";
import { getProjects } from "@/lib/api/projects";
import { getWorkspaces } from "@/lib/api/workspaces";
import type { Hub, Community, Project, Workspace, EntityType } from "@/types";
import { useHubsStore } from "@/store/hubs-store";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export default function HubsPage() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createEntityType, setCreateEntityType] = useState<EntityType>("hub");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const analyticsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.is_admin || false;
  const { searchQuery, entityTypeFilter, sortBy } = useHubsStore();
  const kodeMonoStyle = { fontFamily: "var(--font-kode-mono), monospace" } as const;

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
    }
    // "recommended" - оставляем как есть (уже отсортировано на бэкенде: сначала is_recommended=true, потом members_count)

    return entities;
  }, [hubs, communities, projects, workspaces, entityTypeFilter, sortBy]);

  const entityTypeMap = useMemo(() => {
    const map = new Map<string, "hub" | "community" | "workspace" | "project">();

    hubs.forEach((hub) => map.set(hub.id, "hub"));
    communities.forEach((community) => map.set(community.id, "community"));
    projects.forEach((project) => map.set(project.id, "project"));
    workspaces.forEach((workspace) => map.set(workspace.id, "workspace"));

    return map;
  }, [hubs, communities, projects, workspaces]);

  // Мемоизируем вычисления статистики, чтобы избежать лишних ререндеров
  const { totalMembers, totalCountries } = useMemo(() => {
    const allEntities = [...hubs, ...communities, ...projects, ...workspaces];
    const members = allEntities.reduce((acc, entity) => acc + entity.members_count, 0);
    const countries = new Set(allEntities.map((entity) => entity.country).filter(Boolean)).size;
    return { totalMembers: members, totalCountries: countries };
  }, [hubs, communities, projects, workspaces]);

  const handleAddClick = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    // По умолчанию создаем хаб, но можно расширить для выбора типа
    setCreateEntityType("hub");
    setIsCreateModalOpen(true);
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    // Перезагружаем данные
    window.location.reload();
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-16 pt-20 text-white">
        {/* Hero */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-4 pt-10 text-center sm:px-6 lg:px-8 md:pb-8">
          <h1 className="text-[30px] font-semibold leading-none md:text-[46px]" style={kodeMonoStyle}>
            Solana Hubs
          </h1>
          <p className="mx-auto mt-4 hidden max-w-3xl text-sm text-white/70 md:block md:text-[18px]" style={kodeMonoStyle}>
            Connect with local Solana communities and Superteam chapters around the world.
          </p>

          {/* Stats */}
          <div className="mt-6 hidden items-center justify-center gap-10 md:flex">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-[#14f195]">
                <Users className="h-5 w-5" />
                <span className="text-2xl font-semibold" style={kodeMonoStyle}>
                  {totalMembers.toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm text-white/50" style={kodeMonoStyle}>
                Total Members
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-white">
                <Globe className="h-5 w-5 text-[#14f195]" />
                <span className="text-2xl font-semibold" style={kodeMonoStyle}>
                  {totalCountries}
                </span>
              </div>
              <p className="mt-1 text-sm text-white/50" style={kodeMonoStyle}>
                Countries
              </p>
            </div>
          </div>
        </section>

        {/* Controls */}
        <section className="sticky top-[74px] z-30 border-y border-white/10 bg-black/95 backdrop-blur">
          <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8 md:py-6" style={kodeMonoStyle}>
            <HubsControls />
          </div>
        </section>

        {/* Hubs Grid */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
          {/* Header with filter label and Add button */}
          <div className="flex items-center justify-between w-full mb-6">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-[#14f195] sm:h-5 sm:w-5" />
              <h2 className="text-lg font-semibold text-white sm:text-xl" style={kodeMonoStyle}>
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
                "h-[40px] rounded-[7px] border border-white bg-white px-3 text-xs font-bold text-black transition-colors hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/40",
                "sm:h-[44px] sm:px-6 sm:text-sm"
              )}
              style={kodeMonoStyle}
            >
              <span className="hidden sm:inline">Add your hub, community, or project</span>
              <span className="sm:hidden">Add hub/community/project</span>
            </button>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[10px] border border-white/10 bg-[#101319] p-6 animate-pulse"
                >
                  <div className="mb-4 h-4 w-3/4 rounded bg-white/10" />
                  <div className="mb-2 h-3 w-full rounded bg-white/10" />
                  <div className="h-3 w-5/6 rounded bg-white/10" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="mb-4 text-red-300" style={kodeMonoStyle}>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="h-[40px] rounded-[7px] border border-white bg-white px-4 text-sm font-bold text-black transition-colors hover:bg-white/90"
                style={kodeMonoStyle}
              >
                Try again
              </button>
            </div>
          ) : filteredAndSortedEntities.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedEntities.map((entity) => {
                // Проверяем тип сущности и рендерим соответствующую карточку
                if ("slug" in entity && "members_count" in entity) {
                  // Определяем тип сущности для правильного пути
                  let entityType: "hub" | "community" | "workspace" | "project" | undefined = undefined;
                  
                  if (entityTypeFilter === "community") {
                    entityType = "community";
                  } else if (entityTypeFilter === "workspaces") {
                    entityType = "workspace";
                  } else if (entityTypeFilter === "projects") {
                    entityType = "project";
                  } else if (entityTypeFilter === "hubs") {
                    entityType = "hub";
                  } else if (entityTypeFilter === "all") {
                    // Определяем тип по ID из Map
                    entityType = entityTypeMap.get(entity.id);
                  }
                  
                  // HubCard поддерживает все эти типы и автоматически определит тип, если не передан
                  return <HubCard key={entity.id} hub={entity as Hub | Community | Workspace | Project} entityType={entityType} />;
                }
                return null;
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto mb-4 h-16 w-16 text-white/35" />
              <p className="text-white/70" style={kodeMonoStyle}>
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

      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="This feature is available only for logged-in users"
        description="Please sign up or log in to use this feature."
      />

      <ProSubscriptionModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        title="This feature is available only with PRO subscription"
        description="Adding hubs, communities, projects, or workspaces is available only with PRO subscription. Upgrade to PRO to unlock this feature."
      />
    </>
  );
}
