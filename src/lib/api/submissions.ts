import type {
  EntitySubmission,
  CreateSubmissionRequest,
  SubmissionFilters,
} from "@/types";

export interface GetSubmissionsResponse {
  submissions: EntitySubmission[];
  error?: string;
}

/**
 * Получить заявки текущего пользователя
 */
export async function getSubmissions(
  filters: SubmissionFilters = {}
): Promise<EntitySubmission[]> {
  try {
    const params = new URLSearchParams();

    if (filters.status) {
      params.append("status", filters.status);
    }

    if (filters.entity_type) {
      params.append("entity_type", filters.entity_type);
    }

    const response = await fetch(`/api/submissions?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching submissions:", errorData);
      return [];
    }

    const data: GetSubmissionsResponse = await response.json();
    return data.submissions || [];
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return [];
  }
}

/**
 * Создать новую заявку на создание сущности
 */
export async function createSubmission(
  submissionData: CreateSubmissionRequest
): Promise<EntitySubmission | null> {
  try {
    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error creating submission:", errorData);
      throw new Error(errorData.error || "Failed to create submission");
    }

    const data = await response.json();
    return data.submission || null;
  } catch (error) {
    console.error("Error creating submission:", error);
    throw error;
  }
}

/**
 * Получить заявки для админа
 */
export async function getAdminSubmissions(
  filters: SubmissionFilters & { limit?: number; offset?: number } = {}
): Promise<{
  submissions: EntitySubmission[];
  total: number;
  limit: number;
  offset: number;
}> {
  try {
    const params = new URLSearchParams();

    if (filters.status) {
      params.append("status", filters.status);
    }

    if (filters.entity_type) {
      params.append("entity_type", filters.entity_type);
    }

    if (filters.limit) {
      params.append("limit", String(filters.limit));
    }

    if (filters.offset) {
      params.append("offset", String(filters.offset));
    }

    const response = await fetch(`/api/admin/submissions?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching admin submissions:", errorData);
      throw new Error(errorData.error || "Failed to fetch submissions");
    }

    const data = await response.json();
    return {
      submissions: data.submissions || [],
      total: data.total || 0,
      limit: data.limit || 50,
      offset: data.offset || 0,
    };
  } catch (error) {
    console.error("Error fetching admin submissions:", error);
    throw error;
  }
}

/**
 * Одобрить заявку (только для админов)
 */
export async function approveSubmission(
  submissionId: string,
  adminNotes?: string
): Promise<EntitySubmission | null> {
  try {
    const response = await fetch(`/api/admin/submissions/${submissionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "approve",
        admin_notes: adminNotes,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error approving submission:", errorData);
      throw new Error(errorData.error || "Failed to approve submission");
    }

    const data = await response.json();
    return data.submission || null;
  } catch (error) {
    console.error("Error approving submission:", error);
    throw error;
  }
}

/**
 * Отклонить заявку (только для админов)
 */
export async function rejectSubmission(
  submissionId: string,
  rejectionReason: string,
  adminNotes?: string
): Promise<EntitySubmission | null> {
  try {
    const response = await fetch(`/api/admin/submissions/${submissionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "reject",
        rejection_reason: rejectionReason,
        admin_notes: adminNotes,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error rejecting submission:", errorData);
      throw new Error(errorData.error || "Failed to reject submission");
    }

    const data = await response.json();
    return data.submission || null;
  } catch (error) {
    console.error("Error rejecting submission:", error);
    throw error;
  }
}

