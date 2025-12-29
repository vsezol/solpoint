import type { Hub, Community, Project, Event, Workspace } from "@/types";

export type EntityType = "hub" | "community" | "project" | "workspace" | "event";
export type FieldType = 
  | "text" 
  | "textarea" 
  | "select" 
  | "checkbox" 
  | "datetime" 
  | "number" 
  | "location"
  | "location-global"
  | "coordinates"
  | "image-upload";

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  editable?: boolean;
  visible?: boolean | ((entity: any) => boolean);
  options?: { value: string; label: string }[];
  placeholder?: string;
  validation?: (value: any) => string | null;
  transform?: {
    get: (entity: any) => any;
    set: (value: any) => any;
  };
  dependsOn?: string; // Поле показывается только если зависит от другого поля
  dependsOnValue?: any; // Значение, при котором показывается поле
}

export interface EntityTypeConfig {
  name: string;
  tableName: string;
  membersTable: string;
  entityIdField: string; // Поле ID сущности в таблице members (hub_id, community_id, etc.)
  ownerIdField: string; // Поле owner в основной таблице (owner_id)
  canHaveEvents: boolean;
  membersLabel: string; // "Members" или "Team"
  fields: FieldConfig[];
  apiEndpoint: (id: string) => string;
  membersEndpoint: (id: string, userId: string) => string;
  rolesEndpoint?: (id: string, userId: string) => string;
}

export const ENTITY_CONFIGS: Record<EntityType, EntityTypeConfig> = {
  hub: {
    name: "Hub",
    tableName: "hubs",
    membersTable: "hub_members",
    entityIdField: "hub_id",
    ownerIdField: "owner_id",
    canHaveEvents: true,
    membersLabel: "Members",
    apiEndpoint: (id) => `/api/hubs/${id}`,
    membersEndpoint: (id, userId) => `/api/hubs/${id}/members/${userId}`,
    rolesEndpoint: (id, userId) => `/api/hubs/${id}/members/${userId}/role`,
    fields: [
      {
        key: "image_url",
        label: "Image",
        type: "image-upload",
        editable: true,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        editable: true,
      },
      {
        key: "location",
        label: "Location",
        type: "location-global",
        editable: true,
        transform: {
          get: (entity: Hub) => ({
            isGlobal: !entity.country && !entity.city,
            country: entity.country || "",
            country_code: (entity as any).country_code || "",
            city: entity.city || "",
            latitude: entity.latitude?.toString() || "",
            longitude: entity.longitude?.toString() || "",
          }),
          set: (value: any) => {
            if (value.isGlobal) {
              return {
                country: null,
                country_code: null,
                city: null,
                latitude: null,
                longitude: null,
              };
            }
            return {
              country: value.country || null,
              country_code: value.country_code || null,
              city: value.city || null,
              latitude: value.latitude ? parseFloat(value.latitude) : null,
              longitude: value.longitude ? parseFloat(value.longitude) : null,
            };
          },
        },
      },
    ],
  },

  community: {
    name: "Community",
    tableName: "communities",
    membersTable: "community_members",
    entityIdField: "community_id",
    ownerIdField: "owner_id",
    canHaveEvents: true,
    membersLabel: "Members",
    apiEndpoint: (id) => `/api/communities/${id}`,
    membersEndpoint: (id, userId) => `/api/communities/${id}/members/${userId}`,
    rolesEndpoint: (id, userId) => `/api/communities/${id}/members/${userId}/role`,
    fields: [
      {
        key: "image_url",
        label: "Image",
        type: "image-upload",
        editable: true,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        editable: true,
      },
      // TODO: Добавить community_type и visibility в БД, затем раскомментировать
      // {
      //   key: "community_type",
      //   label: "Community Type",
      //   type: "select",
      //   editable: true,
      //   options: [
      //     { value: "Meme", label: "Meme" },
      //     { value: "NFT", label: "NFT" },
      //     { value: "DAO", label: "DAO" },
      //     { value: "DeFi", label: "DeFi" },
      //     { value: "Gaming", label: "Gaming" },
      //     { value: "Other", label: "Other" },
      //   ],
      // },
      // {
      //   key: "visibility",
      //   label: "Visibility",
      //   type: "select",
      //   editable: true,
      //   options: [
      //     { value: "Public", label: "Public" },
      //     { value: "Private", label: "Private" },
      //     { value: "VIP Only", label: "VIP Only" },
      //     { value: "Invite Only", label: "Invite Only" },
      //   ],
      // },
    ],
  },

  project: {
    name: "Project",
    tableName: "projects",
    membersTable: "project_members",
    entityIdField: "project_id",
    ownerIdField: "owner_id",
    canHaveEvents: true,
    membersLabel: "Team", // ← Заменяем на Team
    apiEndpoint: (id) => `/api/projects/${id}`,
    membersEndpoint: (id, userId) => `/api/projects/${id}/members/${userId}`,
    rolesEndpoint: (id, userId) => `/api/projects/${id}/members/${userId}/role`,
    fields: [
      {
        key: "image_url",
        label: "Image",
        type: "image-upload",
        editable: true,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        editable: true,
      },
      {
        key: "location",
        label: "Location",
        type: "location-global",
        editable: true,
        transform: {
          get: (entity: Project) => ({
            isGlobal: !entity.country && !entity.city,
            country: entity.country || "",
            country_code: (entity as any).country_code || "",
            city: entity.city || "",
            latitude: entity.latitude?.toString() || "",
            longitude: entity.longitude?.toString() || "",
          }),
          set: (value: any) => {
            if (value.isGlobal) {
              return {
                country: null,
                country_code: null,
                city: null,
                latitude: null,
                longitude: null,
              };
            }
            return {
              country: value.country || null,
              country_code: value.country_code || null,
              city: value.city || null,
              latitude: value.latitude ? parseFloat(value.latitude) : null,
              longitude: value.longitude ? parseFloat(value.longitude) : null,
            };
          },
        },
      },
    ],
  },

  workspace: {
    name: "Workspace",
    tableName: "workspaces",
    membersTable: "workspace_members",
    entityIdField: "workspace_id",
    ownerIdField: "owner_id",
    canHaveEvents: true,
    membersLabel: "Members",
    apiEndpoint: (id) => `/api/workspaces/${id}`,
    membersEndpoint: (id, userId) => `/api/workspaces/${id}/members/${userId}`,
    rolesEndpoint: (id, userId) => `/api/workspaces/${id}/members/${userId}/role`,
    fields: [
      {
        key: "image_url",
        label: "Image",
        type: "image-upload",
        editable: true,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        editable: true,
      },
      {
        key: "location",
        label: "Location",
        type: "location",
        editable: true,
        transform: {
          get: (entity: Workspace) => ({
            country: entity.country || "",
            country_code: (entity as any).country_code || "",
            city: entity.city || "",
            address: entity.address || "",
            latitude: entity.latitude?.toString() || "",
            longitude: entity.longitude?.toString() || "",
          }),
          set: (value: any) => ({
            country: value.country || null,
            country_code: value.country_code || null,
            city: value.city || null,
            address: value.address || null,
            latitude: value.latitude ? parseFloat(value.latitude) : null,
            longitude: value.longitude ? parseFloat(value.longitude) : null,
          }),
        },
      },
    ],
  },

  event: {
    name: "Event",
    tableName: "events",
    membersTable: "event_members",
    entityIdField: "event_id",
    ownerIdField: "owner_id",
    canHaveEvents: false, // События не могут иметь свои события
    membersLabel: "Members",
    apiEndpoint: (id) => `/api/events/${id}`,
    membersEndpoint: (id, userId) => `/api/events/${id}/members/${userId}`,
    rolesEndpoint: (id, userId) => `/api/events/${id}/members/${userId}/role`,
    fields: [
      {
        key: "image_url",
        label: "Image",
        type: "image-upload",
        editable: true,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        editable: true,
      },
      {
        key: "visibility",
        label: "Visibility",
        type: "select",
        editable: true,
        options: [
          { value: "public", label: "Public" },
          { value: "vip_only", label: "VIP Only" },
        ],
      },
      {
        key: "start_date",
        label: "Start Date & Time",
        type: "datetime",
        editable: true,
        required: true,
        transform: {
          get: (entity: Event) => entity.start_date ? new Date(entity.start_date).toISOString().slice(0, 16) : "",
          set: (value: string) => value ? new Date(value).toISOString() : null,
        },
      },
      {
        key: "end_date",
        label: "End Date & Time",
        type: "datetime",
        editable: true,
        transform: {
          get: (entity: Event) => entity.end_date ? new Date(entity.end_date).toISOString().slice(0, 16) : "",
          set: (value: string) => value ? new Date(value).toISOString() : null,
        },
      },
      {
        key: "is_paid",
        label: "Paid event",
        type: "checkbox",
        editable: true,
      },
      {
        key: "price_sol",
        label: "Price in SOL",
        type: "number",
        editable: true,
        visible: (entity: Event) => entity.is_paid === true,
        dependsOn: "is_paid",
        dependsOnValue: true,
        transform: {
          get: (entity: Event) => entity.price_sol?.toString() || "",
          set: (value: string) => value ? parseFloat(value) : null,
        },
      },
      {
        key: "is_online",
        label: "Online event",
        type: "checkbox",
        editable: true,
      },
      {
        key: "location",
        label: "Location",
        type: "location",
        editable: true,
        dependsOn: "is_online",
        dependsOnValue: false, // Показываем только если is_online = false
        transform: {
          get: (entity: Event) => ({
            venue_name: entity.venue_name || "",
            address: entity.address || "",
            city: entity.city || "",
            country: entity.country || "",
            country_code: (entity as any).country_code || "",
          }),
          set: (value: any) => ({
            venue_name: value.venue_name || null,
            address: value.address || null,
            city: value.city || null,
            country: value.country || null,
            country_code: value.country_code || null,
          }),
        },
      },
    ],
  },
};

export function getEntityConfig(entityType: EntityType): EntityTypeConfig {
  return ENTITY_CONFIGS[entityType];
}

