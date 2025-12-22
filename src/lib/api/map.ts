import type { MapMarker, MapFilters, User, Event, Hub, Community, Workspace } from "@/types";

export interface GetMapMarkersResponse {
  markers: MapMarker[];
  error?: string;
}

/**
 * Получить маркеры для карты с применением фильтров
 * @param filters - Фильтры для карты
 * @param currentUserId - ID текущего пользователя (для фильтрации mutual friends)
 */
export async function getMapMarkers(
  filters: MapFilters = {
    showUsers: true,
    showEvents: true,
    showHubs: true,
    showWorkspaces: true,
  },
  currentUserId?: string
): Promise<MapMarker[]> {
  const markers: MapMarker[] = [];

  try {
    // Получить пользователей
    if (filters.showUsers) {
      const userParams = new URLSearchParams();
      
      // Приоритет: country_code (если есть), иначе country (для обратной совместимости)
      if (filters.countryCode) {
        userParams.append("country_code", filters.countryCode);
      } else if (filters.country) {
        userParams.append("country", filters.country);
      }
      
      if (filters.city) {
        userParams.append("city", filters.city);
      }
      
      if (filters.userRoles && filters.userRoles.length > 0) {
        userParams.append("roles", filters.userRoles.join(","));
      }
      
      if (filters.openToMeet) {
        userParams.append("open_to_meet", "true");
        // Если включен openToMeet, показываем только mutual friends
        if (currentUserId) {
          userParams.append("mutual_friends_only", "true");
          userParams.append("current_user_id", currentUserId);
        }
      }
      
      if (filters.activeOnly) {
        userParams.append("active_only", "true");
      }

      try {
        const usersResponse = await fetch(`/api/users?${userParams.toString()}`);
        if (usersResponse.ok) {
          const data = await usersResponse.json().catch(() => ({}));
          const { users } = data;
          if (users && Array.isArray(users)) {
            // Преобразуем пользователей в маркеры
            // Если у пользователя нет координат, используем координаты страны/города
            users.forEach((user: User) => {
              // Для пользователей без координат используем координаты по умолчанию
              // В будущем можно добавить геокодинг или хранить координаты в профиле
              const coords = getUserCoordinates(user);
              
              // Пропускаем пользователей с невалидными координатами (0, 0)
              if (coords.lat === 0 && coords.lng === 0) {
                return;
              }
              
              // Проверяем валидность координат
              if (isNaN(coords.lat) || isNaN(coords.lng) || coords.lat < -90 || coords.lat > 90 || coords.lng < -180 || coords.lng > 180) {
                return;
              }
              
              markers.push({
                id: `user-${user.id}`,
                type: user.subscription_tier === "vip" ? "vip_user" : "user",
                latitude: coords.lat,
                longitude: coords.lng,
                data: user,
              });
            });
          }
        }
      } catch (error) {
        console.error("Error fetching users for map:", error);
        // Продолжаем работу даже если не удалось загрузить пользователей
      }
    }

    // Получить события
    if (filters.showEvents) {
      const eventParams = new URLSearchParams();
      
      // Приоритет: country_code (если есть), иначе country (для обратной совместимости)
      if (filters.countryCode) {
        eventParams.append("country_code", filters.countryCode);
      } else if (filters.country) {
        eventParams.append("country", filters.country);
      }
      
      if (filters.city) {
        eventParams.append("city", filters.city);
      }
      
      if (filters.eventType) {
        eventParams.append("event_type", filters.eventType);
      }
      
      // Показываем только предстоящие события на карте
      eventParams.append("upcoming", "true");

      try {
        const eventsResponse = await fetch(`/api/events?${eventParams.toString()}`);
        if (eventsResponse.ok) {
          const data = await eventsResponse.json().catch(() => ({}));
          const { events } = data;
          if (events && Array.isArray(events)) {
            events.forEach((event: Event) => {
              // Пропускаем события без координат или онлайн события
              if (event.is_online || event.latitude == null || event.longitude == null) {
                return;
              }
              
              // Проверяем валидность координат
              const lat = typeof event.latitude === "number" ? event.latitude : parseFloat(String(event.latitude));
              const lng = typeof event.longitude === "number" ? event.longitude : parseFloat(String(event.longitude));
              
              if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return;
              }
              
              markers.push({
                id: `event-${event.id}`,
                type: "event",
                latitude: lat,
                longitude: lng,
                data: event,
              });
            });
          }
        }
      } catch (error) {
        console.error("Error fetching events for map:", error);
        // Продолжаем работу даже если не удалось загрузить события
      }
    }

    // Получить хабы
    if (filters.showHubs) {
      const hubParams = new URLSearchParams();
      
      if (filters.countryCode) {
        hubParams.append("country_code", filters.countryCode);
      }
      
      if (filters.city) {
        hubParams.append("city", filters.city);
      }

      try {
        const hubsResponse = await fetch(`/api/hubs?${hubParams.toString()}`);
        if (hubsResponse.ok) {
          const data = await hubsResponse.json().catch(() => ({}));
          const { hubs } = data;
          if (hubs && Array.isArray(hubs)) {
            hubs.forEach((hub: Hub) => {
              // Пропускаем хабы без координат
              if (hub.latitude == null || hub.longitude == null) {
                return;
              }
              
              // Проверяем валидность координат
              const lat = typeof hub.latitude === "number" ? hub.latitude : parseFloat(String(hub.latitude));
              const lng = typeof hub.longitude === "number" ? hub.longitude : parseFloat(String(hub.longitude));
              
              if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return;
              }
              
              markers.push({
                id: `hub-${hub.id}`,
                type: "hub",
                latitude: lat,
                longitude: lng,
                data: hub,
              });
            });
          }
        }
      } catch (error) {
        console.error("Error fetching hubs for map:", error);
        // Продолжаем работу даже если не удалось загрузить хабы
      }
    }

    // Получить communities
    if (filters.showCommunities) {
      const communityParams = new URLSearchParams();
      
      if (filters.countryCode) {
        communityParams.append("country_code", filters.countryCode);
      }
      
      if (filters.city) {
        communityParams.append("city", filters.city);
      }

      try {
        const communitiesResponse = await fetch(`/api/communities?${communityParams.toString()}`);
        if (communitiesResponse.ok) {
          const data = await communitiesResponse.json().catch(() => ({}));
          const { communities } = data;
          if (communities && Array.isArray(communities)) {
            communities.forEach((community: Community) => {
              // Пропускаем communities без координат
              if (community.latitude == null || community.longitude == null) {
                return;
              }
              
              // Проверяем валидность координат
              const lat = typeof community.latitude === "number" ? community.latitude : parseFloat(String(community.latitude));
              const lng = typeof community.longitude === "number" ? community.longitude : parseFloat(String(community.longitude));
              
              if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return;
              }
              
              markers.push({
                id: `community-${community.id}`,
                type: "community",
                latitude: lat,
                longitude: lng,
                data: community,
              });
            });
          }
        }
      } catch (error) {
        console.error("Error fetching communities for map:", error);
        // Продолжаем работу даже если не удалось загрузить communities
      }
    }

    // Получить workspaces
    if (filters.showWorkspaces) {
      const workspaceParams = new URLSearchParams();
      
      if (filters.countryCode) {
        workspaceParams.append("country_code", filters.countryCode);
      }
      
      if (filters.city) {
        workspaceParams.append("city", filters.city);
      }

      try {
        const workspacesResponse = await fetch(`/api/workspaces?${workspaceParams.toString()}`);
        if (workspacesResponse.ok) {
          const data = await workspacesResponse.json().catch(() => ({}));
          const { workspaces } = data;
          console.log(workspaces, 'workspaces');
          if (workspaces && Array.isArray(workspaces)) {
            workspaces.forEach((workspace: Workspace) => {
              // Пропускаем workspaces без координат
              if (workspace.latitude == null || workspace.longitude == null) {
                return;
              }
              
              // Проверяем валидность координат
              const lat = typeof workspace.latitude === "number" ? workspace.latitude : parseFloat(String(workspace.latitude));
              const lng = typeof workspace.longitude === "number" ? workspace.longitude : parseFloat(String(workspace.longitude));
              
              if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return;
              }
              
              markers.push({
                id: `workspace-${workspace.id}`,
                type: "workspace",
                latitude: lat,
                longitude: lng,
                data: workspace,
              });
            });
          }
        }
      } catch (error) {
        console.error("Error fetching workspaces for map:", error);
        // Продолжаем работу даже если не удалось загрузить workspaces
      }
    }
  } catch (error) {
    console.error("Error fetching map markers:", error);
  }

  return markers;
}

/**
 * Получить координаты пользователя на основе его страны/города
 * Временное решение до добавления координат в профиль
 */
function getUserCoordinates(user: User): { lat: number; lng: number } {
  // Базовые координаты для некоторых стран
  const countryCoordinates: Record<string, { lat: number; lng: number }> = {
    AR: { lat: -34.6037, lng: -58.3816 }, // Argentina
    KZ: { lat: 43.2566, lng: 76.9286 }, // Kazakhstan
    AE: { lat: 25.2048, lng: 55.2708 }, // UAE
    TR: { lat: 41.0082, lng: 28.9784 }, // Turkey
    TH: { lat: 13.7563, lng: 100.5018 }, // Thailand
    IN: { lat: 12.9716, lng: 77.5946 }, // India
    US: { lat: 40.7128, lng: -74.0060 }, // USA
    GB: { lat: 51.5074, lng: -0.1278 }, // UK
    DE: { lat: 52.5200, lng: 13.4050 }, // Germany
    FR: { lat: 48.8566, lng: 2.3522 }, // France
    RU: { lat: 55.7558, lng: 37.6173 }, // Russia
    CN: { lat: 39.9042, lng: 116.4074 }, // China
    JP: { lat: 35.6762, lng: 139.6503 }, // Japan
    KR: { lat: 37.5665, lng: 126.9780 }, // South Korea
    BR: { lat: -23.5505, lng: -46.6333 }, // Brazil
    MX: { lat: 19.4326, lng: -99.1332 }, // Mexico
    CA: { lat: 43.6532, lng: -79.3832 }, // Canada
    AU: { lat: -33.8688, lng: 151.2093 }, // Australia
  };

  // Приоритет: используем country_code если есть
  // Fallback: пытаемся найти код по названию страны (для обратной совместимости)
  const code = user.country_code || 
    (user.country ? Object.keys(countryCoordinates).find(k => 
      countryCoordinates[k] && user.country?.toLowerCase().includes(k.toLowerCase())
    ) : null);

  if (code && countryCoordinates[code]) {
    // Добавляем небольшой случайный сдвиг для разных пользователей в одной стране
    const latOffset = (Math.random() - 0.5) * 2;
    const lngOffset = (Math.random() - 0.5) * 2;
    return {
      lat: countryCoordinates[code].lat + latOffset,
      lng: countryCoordinates[code].lng + lngOffset,
    };
  }

  // Если страна не найдена, возвращаем координаты по умолчанию (центр мира)
  return { lat: 0, lng: 0 };
}

