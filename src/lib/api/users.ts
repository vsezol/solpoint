import type { DirectoryUser, UsersFilterType } from "@/types/profile";

export interface UsersListParams {
  filter: UsersFilterType;
  country_code?: string;
  city?: string;
}

export interface UsersListResponse {
  totalUsers: number;
  totalFriends: number;
  users: DirectoryUser[];
  friends: DirectoryUser[];
}

async function parseJsonOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Request failed with status ${response.status}`);
  }
  return data;
}

export async function getUsersList(params: UsersListParams): Promise<UsersListResponse> {
  const query = new URLSearchParams();
  query.set("filter", params.filter);
  if (params.country_code) {
    query.set("country_code", params.country_code);
  }
  if (params.city) {
    query.set("city", params.city);
  }

  const response = await fetch(`/api/users/list?${query.toString()}`);
  return (await parseJsonOrThrow(response)) as UsersListResponse;
}
