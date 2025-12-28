// User types
export type UserRole = "degen" | "developer" | "trader" | "investor" | "designer" | "founder" | "other";
export type SubscriptionTier = "free" | "vip";

// Country type
export interface Country {
  code: string; // ISO 3166-1 alpha-2 (2 chars, uppercase)
  name: string; // Human-readable name
}

export interface User {
  id: string;
  twitter_id: string;
  twitter_handle: string;
  twitter_name: string;
  avatar_url: string;
  banner_url?: string; // URL баннера профиля из Supabase Storage
  bio?: string;
  country?: string; // @deprecated Use country_code instead
  country_code?: string; // ISO 3166-1 alpha-2 (e.g., "US", "RU")
  city?: string; // Max 150 characters
  role?: UserRole;
  is_open_to_meet: boolean;
  subscription_tier: SubscriptionTier;
  is_verified: boolean;
  is_admin?: boolean; // Опционально, так как поле может не существовать до выполнения миграции
  enable_dashboard?: boolean; // Показывать ли Dashboard в навигации (если пользователь владеет хотя бы одной сущностью)
  wallet_address?: string;
  socials?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  mutual_followers_count?: number;
  mutual_followers?: User[];
  events_attended?: Event[];
  events_upcoming?: Event[];
}

// Event types
export type EventType = "official" | "community" | "private" | "meetup";
export type EventVisibility = "public" | "vip_only";
export type AttendeeStatus = "going" | "maybe" | "not_going";
export type OwnerType = "user" | "hub" | "community" | "project" | "workspace";

export interface Event {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  slug: string; // Публичная ссылка для SEO
  country: string;
  country_code?: string; // ISO 3166-1 alpha-2
  city: string;
  address?: string;
  venue_name?: string; // Название места проведения
  latitude: number;
  longitude: number;
  start_date: string;
  end_date?: string;
  timezone?: string; // Часовой пояс (например, "America/New_York")
  event_type: EventType;
  visibility: EventVisibility;
  is_paid: boolean;
  price_sol?: number;
  price_usd?: number; // Цена в долларах
  max_attendees?: number;
  attendees_count: number;
  capacity_remaining?: number; // Оставшиеся места
  registration_deadline?: string; // Дедлайн регистрации
  is_online: boolean; // Онлайн/офлайн (гибрид пока не делаем)
  is_recommended?: boolean; // Рекомендованное событие (показывается в приоритете)
  socials?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
  };
  contacts?: {
    email?: string;
    telegram?: string;
    phone?: string;
    other?: string; // Другие контакты
  };
  // Унифицированные поля
  owner_type: OwnerType;
  owner_id: string;
  // Связанные данные (при загрузке с JOIN)
  owner_user?: User;
  owner_hub?: Hub;
  owner_community?: Community;
  owner_project?: Project;
  owner_workspace?: Workspace;
  created_at: string;
  updated_at?: string;
}

// Участник ивента
export interface EventMember {
  id: string;
  event_id: string;
  user_id: string;
  user?: User; // При загрузке с JOIN
  status: AttendeeStatus; // going / maybe / not_going
  registered_at: string;
}

// Спикер ивента
export interface EventSpeaker {
  id: string;
  event_id: string;
  user_id: string;
  user?: User; // При загрузке с JOIN
  topic?: string; // Тема выступления
  bio?: string; // Краткая биография для этого ивента
  order?: number; // Порядок выступления
  created_at: string;
}

// Hub types
export interface Hub {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  slug: string; // Публичная ссылка для SEO
  country?: string | null; // Страна для размещения на карте. NULL для глобальных хабов
  city?: string | null; // Опционально, если есть локация
  latitude?: number | null; // Координаты для размещения на карте (не точные). NULL для глобальных хабов
  longitude?: number | null; // NULL для глобальных хабов
  members_count: number;
  socials?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
  };
  // Унифицированное поле
  owner_id: string;
  owner?: User; // При загрузке с JOIN
  created_at: string;
  updated_at?: string;
}

// Community types
// Комьюнити: нет места в конкретной стране, существуют по всему миру, в основном общение в чатах
export interface Community {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  slug: string; // Публичная ссылка для SEO
  country?: string | null; // Страна для размещения на карте. NULL для глобальных комьюнити
  city?: string | null; // Опционально, если есть локация
  latitude?: number | null; // Координаты для размещения на карте (не точные). NULL для глобальных комьюнити
  longitude?: number | null; // NULL для глобальных комьюнити
  members_count: number;
  socials?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
  };
  // Унифицированное поле
  owner_id?: string;
  owner?: User; // При загрузке с JOIN
  created_at: string;
  updated_at?: string;
}

// Project types
// Проекты: стартапы или продукты, создавать может только юзер
export interface Project {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  slug: string; // Публичная ссылка для SEO
  country?: string | null; // Страна для размещения на карте. NULL для глобальных проектов
  city?: string | null; // Опционально, если есть локация
  latitude?: number | null; // Координаты для размещения на карте (не точные). NULL для глобальных проектов
  longitude?: number | null; // NULL для глобальных проектов
  members_count: number;
  socials?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
  };
  // Унифицированное поле
  owner_id: string; // Проект должен иметь владельца
  owner?: User; // При загрузке с JOIN
  created_at: string;
  updated_at?: string;
}

// Workspace types
// Workspaces: коворкинги, похожи на hubs, но с обязательным адресом
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  slug: string; // Публичная ссылка для SEO
  country: string; // Страна обязательна
  city?: string | null; // Опционально
  address: string; // Адрес обязателен для workspaces
  latitude: number;
  longitude: number;
  members_count: number;
  socials?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
  };
  owner_id: string;
  created_at: string;
  updated_at?: string;
}

// Map types
export interface MapMarker {
  id: string;
  type: "user" | "pro_user" | "event" | "hub" | "community" | "project" | "workspace";
  latitude: number;
  longitude: number;
  data: User | Event | Hub | Community | Project | Workspace;
}

export interface CountryStats {
  country_code: string; // ISO 3166-1 alpha-2
  country_name?: string; // Human-readable name from countries table
  users_count: number;
  vip_users_count: number;
  events_count?: number;
  hubs_count?: number;
  communities_count?: number;
  projects_count?: number;
}

// Filter types
export type ContentTypeFilter = "all" | "users" | "events" | "hubs" | "communities" | "projects" | "workspaces";

export interface MapFilters {
  showUsers: boolean;
  showEvents: boolean;
  showHubs: boolean;
  showCommunities?: boolean;
  showProjects?: boolean;
  showWorkspaces?: boolean;
  contentType?: ContentTypeFilter; // Переключатель: all | users | events | hubs | communities | projects | workspaces
  userRoles?: UserRole[];
  eventType?: EventType;
  openToMeet?: boolean;
  activeOnly?: boolean;
  country?: string;
  countryCode?: string;
  city?: string;
}

// Message types
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  participant: User;
  last_message?: Message;
  unread_count: number;
}

// Auth types
export interface AuthUser {
  id: string;
  twitter_id: string;
  twitter_handle: string;
  twitter_name: string;
  avatar_url: string;
  subscription_tier: SubscriptionTier;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Geolocation types
export interface GeoLocation {
  country?: string; // @deprecated Use country_name instead
  country_code: string; // ISO 3166-1 alpha-2
  country_name?: string; // Human-readable name
  city?: string; // Max 150 characters
  latitude: number;
  longitude: number;
}

// Invite types
export interface Invite {
  id: string;
  code: string;
  inviter_user_id: string;
  max_uses?: number | null;
  expires_at?: string | null;
  created_at: string;
  uses_count?: number; // Количество использований (добавляется на сервере)
}

export interface Referral {
  id: string;
  invite_id: string;
  inviter_user_id: string;
  invited_user_id: string;
  created_at: string;
}

// Entity submission types (for moderation system)
export type EntityType = "event" | "hub" | "community" | "project" | "workspace";
export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface EntitySubmission {
  id: string;
  entity_type: EntityType;
  submitter_id: string;
  submitter?: User; // При загрузке с JOIN
  entity_data: Record<string, any>; // JSONB данные сущности
  contacts: {
    email?: string;
    telegram?: string;
    phone?: string;
  };
  status: SubmissionStatus;
  reviewed_by?: string;
  reviewed_by_user?: User; // При загрузке с JOIN
  reviewed_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
  approved_entity_id?: string;
  approved_entity_type?: EntityType;
  created_at: string;
  updated_at?: string;
}

// Типы для создания заявки
export interface CreateSubmissionRequest {
  entity_type: EntityType;
  entity_data: Record<string, any>;
  contacts: {
    email?: string;
    telegram?: string;
    phone?: string;
  };
}

// Типы для админки
export interface SubmissionFilters {
  entity_type?: EntityType;
  status?: SubmissionStatus;
  limit?: number;
  offset?: number;
}

// Subscription types
export type SubscriptionStatus = "active" | "expired" | "cancelled" | "pending";
export type PaymentStatus = "pending" | "waiting" | "confirming" | "confirmed" | "finished" | "failed" | "refunded" | "expired";

export interface Plan {
  id: string;
  code: string; // "monthly", "yearly"
  price: number;
  currency: string;
  interval_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  provider: string; // "nowpayments"
  provider_payment_id?: string; // payment_id от провайдера
  tx_hash?: string; // hash транзакции
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  confirmed_at?: string;
  updated_at: string;
  // Дополнительные поля для NowPayments
  parent_payment_id?: string;
  purchase_id?: string;
  pay_address?: string;
  pay_amount?: number;
  pay_currency?: string;
  price_amount?: number;
  price_currency?: string;
  outcome_amount?: number;
  outcome_currency?: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan?: Plan; // При загрузке с JOIN
  status: SubscriptionStatus;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  last_payment_id?: string;
  last_payment?: Payment; // При загрузке с JOIN
}

// Типы для создания платежа
export interface CreatePaymentRequest {
  plan_id: string;
  success_url?: string;
  cancel_url?: string;
  ipn_callback_url?: string;
}

export interface CreatePaymentResponse {
  payment_id: string;
  payment_url?: string; // URL для редиректа пользователя
  pay_address?: string; // Адрес для депозита
  pay_amount?: number;
  pay_currency?: string;
  price_amount: number;
  price_currency: string;
  status: PaymentStatus;
  expires_at?: string;
}

