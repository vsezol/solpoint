"use client";

import { useState, useEffect } from "react";
import { Header, Footer } from "@/components/layout";
import { Button, Input } from "@/components/ui";
import {
  getAdminSubmissions,
  approveSubmission,
  rejectSubmission,
} from "@/lib/api/submissions";
import { useAuth } from "@/hooks/use-auth";
import type { EntitySubmission, EntityType, SubmissionStatus } from "@/types";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Loader2,
  Mail,
  MessageCircle,
  Calendar,
  MapPin,
  User,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Globe,
  DollarSign,
  Users,
  Eye,
  EyeOff,
  Building2,
  Phone,
  Link as LinkIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

type SubmissionSocialLinks = {
  twitter?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
};

type SubmissionContacts = {
  email?: string;
  telegram?: string;
  phone?: string;
  other?: string;
};

type SubmissionEntityData = {
  name?: string;
  description?: string;
  image_url?: string;
  start_date?: string;
  end_date?: string;
  event_type?: string;
  visibility?: string;
  is_paid?: boolean;
  price_sol?: number;
  price_usd?: number;
  max_attendees?: number;
  is_online?: boolean;
  timezone?: string;
  registration_deadline?: string;
  address?: string;
  venue_name?: string;
  latitude?: number;
  longitude?: number;
  socials?: SubmissionSocialLinks;
  contacts?: SubmissionContacts;
  hub_id?: string;
  community_id?: string;
  project_id?: string;
  city?: string;
  country?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
}

function normalizeSocialLinks(value: unknown): SubmissionSocialLinks | undefined {
  if (!isRecord(value)) return undefined;

  const socials: SubmissionSocialLinks = {
    twitter: asString(value.twitter),
    instagram: asString(value.instagram),
    facebook: asString(value.facebook),
    website: asString(value.website),
  };

  if (!socials.twitter && !socials.instagram && !socials.facebook && !socials.website) {
    return undefined;
  }

  return socials;
}

function normalizeContacts(value: unknown): SubmissionContacts | undefined {
  if (!isRecord(value)) return undefined;

  const contacts: SubmissionContacts = {
    email: asString(value.email),
    telegram: asString(value.telegram),
    phone: asString(value.phone),
    other: asString(value.other),
  };

  if (!contacts.email && !contacts.telegram && !contacts.phone && !contacts.other) {
    return undefined;
  }

  return contacts;
}

function normalizeEntityData(value: Record<string, unknown>): SubmissionEntityData {
  return {
    name: asString(value.name),
    description: asString(value.description),
    image_url: asString(value.image_url),
    start_date: asString(value.start_date),
    end_date: asString(value.end_date),
    event_type: asString(value.event_type),
    visibility: asString(value.visibility),
    is_paid: asBoolean(value.is_paid),
    price_sol: asNumber(value.price_sol),
    price_usd: asNumber(value.price_usd),
    max_attendees: asNumber(value.max_attendees),
    is_online: asBoolean(value.is_online),
    timezone: asString(value.timezone),
    registration_deadline: asString(value.registration_deadline),
    address: asString(value.address),
    venue_name: asString(value.venue_name),
    latitude: asNumber(value.latitude),
    longitude: asNumber(value.longitude),
    socials: normalizeSocialLinks(value.socials),
    contacts: normalizeContacts(value.contacts),
    hub_id: asString(value.hub_id),
    community_id: asString(value.community_id),
    project_id: asString(value.project_id),
    city: asString(value.city),
    country: asString(value.country),
  };
}

export default function AdminSubmissionsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [submissions, setSubmissions] = useState<EntitySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<EntityType | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<
    SubmissionStatus | "all"
  >("pending");
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    submissionId: string | null;
    reason: string;
  }>({
    open: false,
    submissionId: null,
    reason: "",
  });
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(
    new Set()
  );

  const limit = 20;

  // Check admin access
  useEffect(() => {
    if (!authLoading && (!user || !user.is_admin)) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Fetch submissions
  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: Parameters<typeof getAdminSubmissions>[0] = {
        limit,
        offset,
      };

      if (selectedType !== "all") {
        filters.entity_type = selectedType;
      }

      if (selectedStatus !== "all") {
        filters.status = selectedStatus;
      }

      const result = await getAdminSubmissions(filters);
      setSubmissions(result.submissions);
      setTotal(result.total);
    } catch (err: any) {
      console.error("Error fetching submissions:", err);
      setError(err.message || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [selectedType, selectedStatus, offset]);

  // Handle approve
  const handleApprove = async (submissionId: string) => {
    try {
      setProcessingId(submissionId);
      await approveSubmission(submissionId);
      await fetchSubmissions(); // Refresh list
    } catch (err: any) {
      console.error("Error approving submission:", err);
      alert(err.message || "Failed to approve submission");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!rejectModal.submissionId || !rejectModal.reason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    try {
      setProcessingId(rejectModal.submissionId);
      await rejectSubmission(
        rejectModal.submissionId,
        rejectModal.reason.trim()
      );
      setRejectModal({ open: false, submissionId: null, reason: "" });
      await fetchSubmissions(); // Refresh list
    } catch (err: any) {
      console.error("Error rejecting submission:", err);
      alert(err.message || "Failed to reject submission");
    } finally {
      setProcessingId(null);
    }
  };

  // Filter submissions by search
  const filteredSubmissions = submissions.filter((submission) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const entityData = normalizeEntityData(submission.entity_data);
    const name = entityData?.name?.toLowerCase() || "";
    const description = entityData?.description?.toLowerCase() || "";
    const submitterName =
      submission.submitter?.twitter_name?.toLowerCase() || "";
    const submitterHandle =
      submission.submitter?.twitter_handle?.toLowerCase() || "";

    return (
      name.includes(query) ||
      description.includes(query) ||
      submitterName.includes(query) ||
      submitterHandle.includes(query)
    );
  });

  const getStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-500">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-500">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
    }
  };

  const getEntityTypeLabel = (type: EntityType) => {
    switch (type) {
      case "event":
        return "Event";
      case "hub":
        return "Hub";
      case "community":
        return "Community";
      case "project":
        return "Project";
    }
  };

  const toggleExpanded = (submissionId: string) => {
    setExpandedSubmissions((prev) => {
      const next = new Set(prev);
      if (next.has(submissionId)) {
        next.delete(submissionId);
      } else {
        next.add(submissionId);
      }
      return next;
    });
  };

  const isExpanded = (submissionId: string) => {
    return expandedSubmissions.has(submissionId);
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <>
        <Header />
        <main className="pt-16 min-h-screen bg-[var(--color-background)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
        </main>
        <Footer />
      </>
    );
  }

  // Show nothing if not admin (will redirect)
  if (!user || !user.is_admin) {
    return null;
  }

  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-[var(--color-background)]">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
                    Submissions Moderation
                  </h1>
                  <p className="text-[var(--color-text-secondary)]">
                    Review and approve/reject entity submissions
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push("/admin")}
                >
                  Back to Admin
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search by name, description, or submitter..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<Search className="w-4 h-4" />}
                  />
                </div>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value as EntityType | "all");
                    setOffset(0);
                  }}
                  className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="all">All Types</option>
                  <option value="event">Events</option>
                  <option value="hub">Hubs</option>
                  <option value="community">Communities</option>
                  <option value="project">Projects</option>
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value as SubmissionStatus | "all");
                    setOffset(0);
                  }}
                  className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-sm text-[var(--color-text-secondary)]">
                <span>Total: {total}</span>
                <span>Showing: {filteredSubmissions.length}</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-4 bg-[var(--color-error)]/10 border border-[var(--color-error)] rounded-lg text-[var(--color-error)]">
                {error}
              </div>
            )}

            {/* Loading */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--color-text-secondary)]">
                  No submissions found
                </p>
              </div>
            ) : (
              <>
                {/* Submissions List */}
                <div className="space-y-4 mb-8">
                  {filteredSubmissions.map((submission) => {
                    const entityData = normalizeEntityData(submission.entity_data);
                    const isProcessing = processingId === submission.id;

                    return (
                      <div
                        key={submission.id}
                        className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                                {entityData?.name || "Untitled"}
                              </h3>
                              {getStatusBadge(submission.status)}
                              <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]">
                                {getEntityTypeLabel(submission.entity_type)}
                              </span>
                            </div>
                            {entityData?.description && (
                              <p className="text-[var(--color-text-secondary)] mb-3 line-clamp-2">
                                {entityData.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Expandable Details Button */}
                        <div className="mb-4">
                          <Button
                            variant="outline"
                            onClick={() => toggleExpanded(submission.id)}
                            className="w-full"
                          >
                            {isExpanded(submission.id) ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-2" />
                                Скрыть подробности
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-2" />
                                Показать подробности
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded(submission.id) && (
                          <div className="mb-4 p-4 bg-[var(--color-background)] rounded-lg border border-[var(--color-surface-border)]">
                            {/* Image */}
                            {entityData?.image_url && (
                              <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
                                  <ImageIcon className="w-4 h-4" />
                                  Изображение
                                </div>
                                <img
                                  src={entityData.image_url}
                                  alt={entityData?.name || "Entity image"}
                                  className="max-w-full h-auto max-h-64 rounded-lg border border-[var(--color-surface-border)]"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display =
                                      "none";
                                  }}
                                />
                              </div>
                            )}

                            {/* Full Description */}
                            {entityData?.description && (
                              <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
                                  <MessageCircle className="w-4 h-4" />
                                  Полное описание
                                </div>
                                <p className="text-[var(--color-text-primary)] whitespace-pre-wrap">
                                  {entityData.description}
                                </p>
                              </div>
                            )}

                            {/* Event-specific fields */}
                            {submission.entity_type === "event" && (
                              <div className="space-y-3 mb-4">
                                <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">
                                  Информация о событии
                                </h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  {entityData?.start_date && (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                      <span className="text-[var(--color-text-secondary)]">
                                        Начало:
                                      </span>
                                      <span className="text-[var(--color-text-primary)] font-medium">
                                        {new Date(
                                          entityData.start_date
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  {entityData?.end_date && (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                      <span className="text-[var(--color-text-secondary)]">
                                        Конец:
                                      </span>
                                      <span className="text-[var(--color-text-primary)] font-medium">
                                        {new Date(
                                          entityData.end_date
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  {entityData?.event_type && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-[var(--color-text-secondary)]">
                                        Тип события:
                                      </span>
                                      <span className="text-[var(--color-text-primary)] font-medium capitalize">
                                        {entityData.event_type}
                                      </span>
                                    </div>
                                  )}
                                  {entityData?.visibility && (
                                    <div className="flex items-center gap-2">
                                      {entityData.visibility === "vip_only" ? (
                                        <EyeOff className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                      ) : (
                                        <Eye className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                      )}
                                      <span className="text-[var(--color-text-secondary)]">
                                        Видимость:
                                      </span>
                                      <span className="text-[var(--color-text-primary)] font-medium capitalize">
                                        {entityData.visibility === "vip_only"
                                          ? "Только для PRO"
                                          : "Публичное"}
                                      </span>
                                    </div>
                                  )}
                                  {entityData?.is_paid !== undefined && (
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                      <span className="text-[var(--color-text-secondary)]">
                                        Платное:
                                      </span>
                                      <span className="text-[var(--color-text-primary)] font-medium">
                                        {entityData.is_paid ? "Да" : "Нет"}
                                      </span>
                                    </div>
                                  )}
                                  {entityData?.price_sol && (
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                      <span className="text-[var(--color-text-secondary)]">
                                        Цена:
                                      </span>
                                      <span className="text-[var(--color-text-primary)] font-medium">
                                        {entityData.price_sol} SOL
                                        {entityData.price_usd &&
                                          ` ($${entityData.price_usd})`}
                                      </span>
                                    </div>
                                  )}
                                  {entityData?.max_attendees && (
                                    <div className="flex items-center gap-2">
                                      <Users className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                      <span className="text-[var(--color-text-secondary)]">
                                        Макс. участников:
                                      </span>
                                      <span className="text-[var(--color-text-primary)] font-medium">
                                        {entityData.max_attendees}
                                      </span>
                                    </div>
                                  )}
                                  {entityData?.is_online !== undefined && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-[var(--color-text-secondary)]">
                                        Формат:
                                      </span>
                                      <span className="text-[var(--color-text-primary)] font-medium">
                                        {entityData.is_online
                                          ? "Онлайн"
                                          : "Офлайн"}
                                      </span>
                                    </div>
                                  )}
                                  {entityData?.timezone && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-[var(--color-text-secondary)]">
                                        Часовой пояс:
                                      </span>
                                      <span className="text-[var(--color-text-primary)] font-medium">
                                        {entityData.timezone}
                                      </span>
                                    </div>
                                  )}
                                  {entityData?.registration_deadline && (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                      <span className="text-[var(--color-text-secondary)]">
                                        Дедлайн регистрации:
                                      </span>
                                      <span className="text-[var(--color-text-primary)] font-medium">
                                        {new Date(
                                          entityData.registration_deadline
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Address and Venue */}
                                {(entityData?.address ||
                                  entityData?.venue_name) && (
                                  <div className="mt-3 pt-3 border-t border-[var(--color-surface-border)]">
                                    <div className="flex items-center gap-2 mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
                                      <Building2 className="w-4 h-4" />
                                      Место проведения
                                    </div>
                                    {entityData?.venue_name && (
                                      <p className="text-[var(--color-text-primary)] mb-1">
                                        <span className="font-medium">
                                          {entityData.venue_name}
                                        </span>
                                      </p>
                                    )}
                                    {entityData?.address && (
                                      <p className="text-[var(--color-text-secondary)] text-sm">
                                        {entityData.address}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Coordinates */}
                                {(entityData?.latitude ||
                                  entityData?.longitude) && (
                                  <div className="mt-3 pt-3 border-t border-[var(--color-surface-border)]">
                                    <div className="flex items-center gap-2 mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
                                      <MapPin className="w-4 h-4" />
                                      Координаты
                                    </div>
                                    <p className="text-[var(--color-text-primary)] text-sm">
                                      {entityData.latitude?.toFixed(6)},{" "}
                                      {entityData.longitude?.toFixed(6)}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Hub/Community/Project-specific fields */}
                            {(submission.entity_type === "hub" ||
                              submission.entity_type === "community" ||
                              submission.entity_type === "project") && (
                              <div className="space-y-3 mb-4">
                                <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">
                                  Дополнительная информация
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  {/* Coordinates */}
                                  {(entityData?.latitude ||
                                    entityData?.longitude) && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                      <span className="text-[var(--color-text-secondary)]">
                                        Координаты:
                                      </span>
                                      <span className="text-[var(--color-text-primary)] font-medium">
                                        {entityData.latitude?.toFixed(6)},{" "}
                                        {entityData.longitude?.toFixed(6)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Social Links */}
                            {entityData?.socials &&
                              Object.keys(entityData.socials).length > 0 && (
                                <div className="mb-4 pt-4 border-t border-[var(--color-surface-border)]">
                                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-[var(--color-text-secondary)]">
                                    <LinkIcon className="w-4 h-4" />
                                    Социальные сети
                                  </div>
                                  <div className="flex flex-wrap gap-3">
                                    {entityData.socials.twitter && (
                                      <a
                                        href={entityData.socials.twitter}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-sm text-[var(--color-text-primary)] hover:border-[var(--color-primary)] transition-colors"
                                      >
                                        <Globe className="w-4 h-4" />
                                        Twitter
                                      </a>
                                    )}
                                    {entityData.socials.instagram && (
                                      <a
                                        href={entityData.socials.instagram}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-sm text-[var(--color-text-primary)] hover:border-[var(--color-primary)] transition-colors"
                                      >
                                        <Globe className="w-4 h-4" />
                                        Instagram
                                      </a>
                                    )}
                                    {entityData.socials.facebook && (
                                      <a
                                        href={entityData.socials.facebook}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-sm text-[var(--color-text-primary)] hover:border-[var(--color-primary)] transition-colors"
                                      >
                                        <Globe className="w-4 h-4" />
                                        Facebook
                                      </a>
                                    )}
                                    {entityData.socials.website && (
                                      <a
                                        href={entityData.socials.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-sm text-[var(--color-text-primary)] hover:border-[var(--color-primary)] transition-colors"
                                      >
                                        <Globe className="w-4 h-4" />
                                        Website
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* Contacts from submission */}
                            {(submission.contacts?.email ||
                              submission.contacts?.telegram ||
                              submission.contacts?.phone) && (
                              <div className="mb-4 pt-4 border-t border-[var(--color-surface-border)]">
                                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-[var(--color-text-secondary)]">
                                  <Mail className="w-4 h-4" />
                                  Контакты для связи
                                </div>
                                <div className="space-y-2 text-sm">
                                  {submission.contacts?.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                      <span className="text-[var(--color-text-primary)]">
                                        {submission.contacts.email}
                                      </span>
                                    </div>
                                  )}
                                  {submission.contacts?.telegram && (
                                    <div className="flex items-center gap-2">
                                      <MessageCircle className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                      <span className="text-[var(--color-text-primary)]">
                                        {submission.contacts.telegram}
                                      </span>
                                    </div>
                                  )}
                                  {submission.contacts?.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                      <span className="text-[var(--color-text-primary)]">
                                        {submission.contacts.phone}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Contacts from entity_data (for events) */}
                            {submission.entity_type === "event" &&
                              entityData?.contacts &&
                              Object.keys(entityData.contacts).length > 0 && (
                                <div className="mb-4 pt-4 border-t border-[var(--color-surface-border)]">
                                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-[var(--color-text-secondary)]">
                                    <Mail className="w-4 h-4" />
                                    Контакты события
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    {entityData.contacts.email && (
                                      <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                        <span className="text-[var(--color-text-primary)]">
                                          {entityData.contacts.email}
                                        </span>
                                      </div>
                                    )}
                                    {entityData.contacts.telegram && (
                                      <div className="flex items-center gap-2">
                                        <MessageCircle className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                        <span className="text-[var(--color-text-primary)]">
                                          {entityData.contacts.telegram}
                                        </span>
                                      </div>
                                    )}
                                    {entityData.contacts.phone && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                        <span className="text-[var(--color-text-primary)]">
                                          {entityData.contacts.phone}
                                        </span>
                                      </div>
                                    )}
                                    {entityData.contacts.other && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-[var(--color-text-secondary)]">
                                          Другое:
                                        </span>
                                        <span className="text-[var(--color-text-primary)]">
                                          {entityData.contacts.other}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* Related entities (for events) */}
                            {submission.entity_type === "event" &&
                              (entityData?.hub_id ||
                                entityData?.community_id ||
                                entityData?.project_id) && (
                                <div className="mb-4 pt-4 border-t border-[var(--color-surface-border)]">
                                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-[var(--color-text-secondary)]">
                                    <LinkIcon className="w-4 h-4" />
                                    Связанные сущности
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    {entityData.hub_id && (
                                      <div className="text-[var(--color-text-primary)]">
                                        Hub ID: {entityData.hub_id}
                                      </div>
                                    )}
                                    {entityData.community_id && (
                                      <div className="text-[var(--color-text-primary)]">
                                        Community ID: {entityData.community_id}
                                      </div>
                                    )}
                                    {entityData.project_id && (
                                      <div className="text-[var(--color-text-primary)]">
                                        Project ID: {entityData.project_id}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* Admin Notes */}
                            {submission.admin_notes && (
                              <div className="mb-4 pt-4 border-t border-[var(--color-surface-border)]">
                                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
                                  Заметки админа
                                </div>
                                <p className="text-[var(--color-text-primary)] text-sm whitespace-pre-wrap">
                                  {submission.admin_notes}
                                </p>
                              </div>
                            )}

                            {/* Raw JSON (for debugging) */}
                            <details className="mt-4 pt-4 border-t border-[var(--color-surface-border)]">
                              <summary className="cursor-pointer text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                                Показать все данные (JSON)
                              </summary>
                              <pre className="mt-2 p-3 bg-[var(--color-background)] rounded border border-[var(--color-surface-border)] text-xs overflow-auto max-h-64">
                                {JSON.stringify(entityData, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}

                        {/* Submission Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                              <User className="w-4 h-4" />
                              <span>
                                Submitted by:{" "}
                                <span className="text-[var(--color-text-primary)] font-medium">
                                  @{submission.submitter?.twitter_handle || "Unknown"}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {new Date(submission.created_at).toLocaleString()}
                              </span>
                            </div>
                            {submission.entity_type === "event" &&
                              entityData?.start_date && (
                                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    Event Date:{" "}
                                    {new Date(
                                      entityData.start_date
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            {(entityData?.city || entityData?.country) && (
                              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                                <MapPin className="w-4 h-4" />
                                <span>
                                  {[entityData.city, entityData.country]
                                    .filter(Boolean)
                                    .join(", ")}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            {submission.contacts?.email && (
                              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                                <Mail className="w-4 h-4" />
                                <span>{submission.contacts.email}</span>
                              </div>
                            )}
                            {submission.contacts?.telegram && (
                              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                                <MessageCircle className="w-4 h-4" />
                                <span>{submission.contacts.telegram}</span>
                              </div>
                            )}
                            {submission.reviewed_by_user && (
                              <div className="text-[var(--color-text-secondary)]">
                                Reviewed by: @
                                {submission.reviewed_by_user.twitter_handle}
                                {submission.reviewed_at &&
                                  ` on ${new Date(
                                    submission.reviewed_at
                                  ).toLocaleString()}`}
                              </div>
                            )}
                            {submission.rejection_reason && (
                              <div className="text-[var(--color-error)]">
                                Reason: {submission.rejection_reason}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {submission.status === "pending" && (
                          <div className="flex gap-3 pt-4 border-t border-[var(--color-surface-border)]">
                            <Button
                              variant="primary"
                              onClick={() => handleApprove(submission.id)}
                              disabled={isProcessing}
                              className="flex-1"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() =>
                                setRejectModal({
                                  open: true,
                                  submissionId: submission.id,
                                  reason: "",
                                })
                              }
                              disabled={isProcessing}
                              className="flex-1"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {total > limit && (
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setOffset(Math.max(0, offset - limit))}
                      disabled={offset === 0 || loading}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      Page {Math.floor(offset / limit) + 1} of{" "}
                      {Math.ceil(total / limit)}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setOffset(offset + limit)}
                      disabled={offset + limit >= total || loading}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
              Reject Submission
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Please provide a reason for rejection. This will be visible to
              the submitter.
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) =>
                setRejectModal({ ...rejectModal, reason: e.target.value })
              }
              placeholder="Enter rejection reason..."
              rows={4}
              className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] mb-4 resize-none focus:outline-none focus:border-[var(--color-primary)]"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  setRejectModal({ open: false, submissionId: null, reason: "" })
                }
                disabled={processingId !== null}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleReject}
                disabled={!rejectModal.reason.trim() || processingId !== null}
                className="flex-1"
              >
                {processingId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Reject"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
