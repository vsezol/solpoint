export const MEETING_REQUEST_EVENT_TYPES = [
  "created",
  "approved",
  "rejected",
  "rescheduled",
] as const;

export function isMeetingRequestsEnabled(): boolean {
  const serverFlag = process.env.MEETING_REQUESTS_ENABLED;
  const publicFlag = process.env.NEXT_PUBLIC_MEETING_REQUESTS_ENABLED;

  if (serverFlag === "false" || publicFlag === "false") {
    return false;
  }

  return true;
}
