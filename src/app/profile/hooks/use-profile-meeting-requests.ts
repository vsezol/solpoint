"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { User, MeetingRequest } from "@/types";
import { trackEvent } from "@/lib/analytics";
import {
  approveMeetingRequest,
  getCanRequestMeeting,
  getMeetingRequests,
  markMeetingEventsRead,
  rejectMeetingRequest,
  rescheduleMeetingRequest,
  type CanRequestMeetingSharedEvent,
} from "@/lib/api/meeting-requests";
import { getOrCreateChat } from "@/lib/api/chats";
import type { CalendarEvent } from "@ilamy/calendar";

export interface MeetingCalendarEventData {
  meetingRequestId: string;
  eventLink?: string;
}

export interface MeetingCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  color: string;
  backgroundColor: string;
  data: MeetingCalendarEventData;
}

type MeetingCalendarAutoScrollTarget = {
  id: string;
  start: string;
  end: string;
};

interface UseProfileMeetingRequestsParams {
  user: User;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
  isVip: boolean;
  currentAuthUserId: string | null;
  meetingRequestsEnabled: boolean;
  searchParams: ReadonlyURLSearchParams;
  push: (href: string) => void;
  onRequirePro?: () => void;
}

const toLocalDateTimeInput = (isoValue: string) => {
  const date = new Date(isoValue);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export function useProfileMeetingRequests({
  user,
  isOwnProfile,
  isAuthenticated,
  isVip,
  currentAuthUserId,
  meetingRequestsEnabled,
  searchParams,
  push,
  onRequirePro,
}: UseProfileMeetingRequestsParams) {
  const [isMeetingRequestsModalOpen, setIsMeetingRequestsModalOpen] = useState(false);
  const [isMeetingCalendarModalOpen, setIsMeetingCalendarModalOpen] = useState(false);
  const [isMeetingDetailsModalOpen, setIsMeetingDetailsModalOpen] = useState(false);
  const [selectedMeetingFromCalendar, setSelectedMeetingFromCalendar] = useState<MeetingRequest | null>(null);

  const [isOpeningMeetingChat, setIsOpeningMeetingChat] = useState(false);
  const [showMeetingDetailsChatProModal, setShowMeetingDetailsChatProModal] = useState(false);
  const [showMeetingDetailsChatAuthModal, setShowMeetingDetailsChatAuthModal] = useState(false);

  const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([]);
  const [isLoadingMeetingRequests, setIsLoadingMeetingRequests] = useState(false);
  const [meetingRequestsError, setMeetingRequestsError] = useState<string | null>(null);
  const meetingRequestsFetchRef = useRef<Promise<void> | null>(null);

  const meetingCalendarContainerRef = useRef<HTMLDivElement | null>(null);
  const targetMeetingEventRef = useRef<HTMLDivElement | null>(null);

  const [actingMeetingRequest, setActingMeetingRequest] = useState<Record<string, boolean>>({});
  const [rescheduleDrafts, setRescheduleDrafts] = useState<
    Record<
      string,
      {
        open: boolean;
        start_at: string;
      }
    >
  >({});

  const [canRequestMeeting, setCanRequestMeeting] = useState<boolean | null>(null);
  const [sharedEventsForMeeting, setSharedEventsForMeeting] = useState<CanRequestMeetingSharedEvent[]>([]);
  const [isProfileMeetingModalOpen, setIsProfileMeetingModalOpen] = useState(false);
  const [showProfileMeetingProModal, setShowProfileMeetingProModal] = useState(false);
  const [showProfileMeetingAuthModal, setShowProfileMeetingAuthModal] = useState(false);

  const actionNeededMeetingRequestsCount = useMemo(
    () => meetingRequests.filter((request) => request.status === "pending" && request.needs_action === true).length,
    [meetingRequests]
  );

  const upcomingMeetingRequestsCount = useMemo(
    () => meetingRequests.filter((request) => request.status === "approved").length,
    [meetingRequests]
  );

  const approvedMeetingCalendarEvents = useMemo<MeetingCalendarEvent[]>(() => {
    return meetingRequests
      .filter((request) => request.status === "approved")
      .flatMap((request): MeetingCalendarEvent[] => {
        const proposal = request.current_proposal;
        if (!proposal?.start_at || !proposal.end_at) {
          return [];
        }

        const startAt = new Date(proposal.start_at);
        const endAt = new Date(proposal.end_at);
        if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
          return [];
        }

        const eventLink = request.event?.slug || request.event?.id;
        const counterpartyName = request.counterparty?.twitter_name || "Unknown user";

        return [
          {
            id: request.id,
            title: `Meetup with ${counterpartyName}`,
            start: proposal.start_at,
            end: proposal.end_at,
            location: proposal.place || undefined,
            description: request.event?.name || proposal.message || undefined,
            color: "var(--color-background)",
            backgroundColor: "var(--color-primary)",
            data: {
              meetingRequestId: request.id,
              eventLink: eventLink || undefined,
            },
          },
        ];
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [meetingRequests]);

  const meetingCalendarAutoScrollTarget = useMemo<MeetingCalendarAutoScrollTarget | null>(() => {
    const now = Date.now();
    const validEvents = approvedMeetingCalendarEvents
      .map((event) => {
        const startAt = new Date(event.start);
        const endAt = new Date(event.end);
        if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
          return null;
        }

        return {
          id: event.id,
          start: event.start,
          end: event.end,
          startMs: startAt.getTime(),
          endMs: endAt.getTime(),
        };
      })
      .filter((event): event is MeetingCalendarAutoScrollTarget & { startMs: number; endMs: number } => event !== null);

    const active = validEvents
      .filter((event) => event.startMs <= now && now < event.endMs)
      .sort((a, b) => b.startMs - a.startMs)[0];

    if (active) {
      return { id: active.id, start: active.start, end: active.end };
    }

    const next = validEvents
      .filter((event) => event.startMs > now)
      .sort((a, b) => a.startMs - b.startMs)[0];

    if (next) {
      return { id: next.id, start: next.start, end: next.end };
    }

    return null;
  }, [approvedMeetingCalendarEvents]);

  const meetingCalendarInitialDate = meetingCalendarAutoScrollTarget?.start ?? undefined;

  async function fetchMeetingRequestsList(options?: { silent?: boolean }) {
    if (!meetingRequestsEnabled || !isAuthenticated || !isVip) {
      setMeetingRequests([]);
      setMeetingRequestsError(null);
      return;
    }

    if (meetingRequestsFetchRef.current) {
      return meetingRequestsFetchRef.current;
    }

    const shouldShowLoading = options?.silent !== true;
    if (shouldShowLoading) {
      setIsLoadingMeetingRequests(true);
    }
    setMeetingRequestsError(null);

    const pendingFetch = (async () => {
      try {
        const response = await getMeetingRequests({ scope: "all" });
        setMeetingRequests(response.data || []);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch meeting requests";
        setMeetingRequestsError(message);
      } finally {
        if (shouldShowLoading) {
          setIsLoadingMeetingRequests(false);
        }
        meetingRequestsFetchRef.current = null;
      }
    })();

    meetingRequestsFetchRef.current = pendingFetch;
    return pendingFetch;
  }

  const handleOpenMeetingRequestsModal = async () => {
    if (!meetingRequestsEnabled || !isVip) {
      onRequirePro?.();
      return;
    }

    trackEvent("meeting_requests_open", {
      event_category: "Meeting Requests",
      event_label: "open_list",
    });

    setIsMeetingRequestsModalOpen(true);
    setMeetingRequests((prev) => prev.map((request) => ({ ...request, unread_events_count: 0 })));
    await markMeetingEventsRead({ mark_all: true }).catch((error) => {
      console.error("Error marking meeting request events as read:", error);
    });
  };

  const handleOpenMeetingCalendarModal = async () => {
    if (!meetingRequestsEnabled || !isVip) {
      onRequirePro?.();
      return;
    }

    trackEvent("meeting_calendar_open", {
      event_category: "Meeting Requests",
      event_label: "open_calendar",
    });

    setIsMeetingCalendarModalOpen(true);
    await fetchMeetingRequestsList().catch((error) => {
      console.error("Error loading meeting requests for calendar:", error);
    });
  };

  const handleOpenMeetingDetailsFromCalendar = (event: CalendarEvent) => {
    const eventData = (event.data ?? {}) as MeetingCalendarEventData;
    const meetingRequestId = eventData.meetingRequestId || String(event.id);
    const meetingRequest = meetingRequests.find((request) => request.id === meetingRequestId);
    if (!meetingRequest) {
      return;
    }

    trackEvent("meeting_calendar_event_open", {
      event_category: "Meeting Requests",
      event_label: "open_meeting_details",
    });

    setSelectedMeetingFromCalendar(meetingRequest);
    setIsMeetingDetailsModalOpen(true);
  };

  const handleCloseMeetingDetailsModal = () => {
    setIsMeetingDetailsModalOpen(false);
    setSelectedMeetingFromCalendar(null);
  };

  const handleOpenMeetingDetailsChat = async () => {
    const counterpartyId = selectedMeetingFromCalendar?.counterparty?.id;
    if (!counterpartyId) {
      return;
    }

    if (!isAuthenticated) {
      setShowMeetingDetailsChatAuthModal(true);
      return;
    }

    if (!isVip) {
      setShowMeetingDetailsChatProModal(true);
      return;
    }

    if (isOpeningMeetingChat) {
      return;
    }

    setIsOpeningMeetingChat(true);
    try {
      const chat = await getOrCreateChat(counterpartyId);
      handleCloseMeetingDetailsModal();
      push(`/chat/${chat.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to open chat");
    } finally {
      setIsOpeningMeetingChat(false);
    }
  };

  const handleOpenProfileMeetingRequest = () => {
    if (!isAuthenticated) {
      setShowProfileMeetingAuthModal(true);
      return;
    }

    if (!isVip) {
      setShowProfileMeetingProModal(true);
      return;
    }

    const first = sharedEventsForMeeting[0];
    if (!first) return;

    setIsProfileMeetingModalOpen(true);
  };

  const handleApproveMeetingRequest = async (requestId: string) => {
    setActingMeetingRequest((prev) => ({ ...prev, [requestId]: true }));
    try {
      await approveMeetingRequest(requestId);
      trackEvent("meeting_request_approve", {
        event_category: "Meeting Requests",
        event_label: "approve",
      });
      await fetchMeetingRequestsList({ silent: true });
      window.dispatchEvent(new Event("meeting-requests-updated"));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to approve meeting request");
    } finally {
      setActingMeetingRequest((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleRejectMeetingRequest = async (requestId: string) => {
    setActingMeetingRequest((prev) => ({ ...prev, [requestId]: true }));
    try {
      await rejectMeetingRequest(requestId);
      trackEvent("meeting_request_reject", {
        event_category: "Meeting Requests",
        event_label: "reject",
      });
      await fetchMeetingRequestsList({ silent: true });
      window.dispatchEvent(new Event("meeting-requests-updated"));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to reject meeting request");
    } finally {
      setActingMeetingRequest((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleToggleReschedule = (meetingRequest: MeetingRequest) => {
    const currentProposal = meetingRequest.current_proposal;
    if (!currentProposal) return;

    setRescheduleDrafts((prev) => ({
      ...prev,
      [meetingRequest.id]: {
        open: !prev[meetingRequest.id]?.open,
        start_at: prev[meetingRequest.id]?.start_at || toLocalDateTimeInput(currentProposal.start_at),
      },
    }));
  };

  const handleSubmitReschedule = async (meetingRequest: MeetingRequest) => {
    const draft = rescheduleDrafts[meetingRequest.id];
    if (!draft) return;

    setActingMeetingRequest((prev) => ({ ...prev, [meetingRequest.id]: true }));
    try {
      await rescheduleMeetingRequest(meetingRequest.id, {
        start_at: new Date(draft.start_at).toISOString(),
      });

      trackEvent("meeting_request_reschedule", {
        event_category: "Meeting Requests",
        event_label: "reschedule",
      });

      setRescheduleDrafts((prev) => ({
        ...prev,
        [meetingRequest.id]: { ...prev[meetingRequest.id], open: false },
      }));

      await fetchMeetingRequestsList({ silent: true });
      window.dispatchEvent(new Event("meeting-requests-updated"));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to propose a new time");
    } finally {
      setActingMeetingRequest((prev) => ({ ...prev, [meetingRequest.id]: false }));
    }
  };

  useEffect(() => {
    if (!isOwnProfile || !meetingRequestsEnabled || !isAuthenticated || !isVip) {
      setMeetingRequests([]);
      setMeetingRequestsError(null);
      setIsLoadingMeetingRequests(false);
      return;
    }

    const refreshCounts = () => {
      fetchMeetingRequestsList({ silent: true });
    };

    refreshCounts();
    const intervalId = setInterval(refreshCounts, 45000);
    window.addEventListener("meeting-requests-updated", refreshCounts);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("meeting-requests-updated", refreshCounts);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwnProfile, isAuthenticated, isVip, meetingRequestsEnabled]);

  useEffect(() => {
    if (isOwnProfile || !meetingRequestsEnabled || !user.id || !isAuthenticated) {
      if (!isOwnProfile) {
        setCanRequestMeeting(false);
        setSharedEventsForMeeting([]);
      }
      return;
    }

    let cancelled = false;
    setCanRequestMeeting(null);

    getCanRequestMeeting(user.id)
      .then((res) => {
        if (!cancelled) {
          setCanRequestMeeting(res.canRequest);
          setSharedEventsForMeeting(res.sharedEvents || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCanRequestMeeting(false);
          setSharedEventsForMeeting([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOwnProfile, meetingRequestsEnabled, user.id, isAuthenticated]);

  useEffect(() => {
    if (!isOwnProfile || !meetingRequestsEnabled || !isAuthenticated || !isVip) {
      return;
    }

    if (searchParams.get("meetingRequests") === "1") {
      trackEvent("meeting_requests_open", {
        event_category: "Meeting Requests",
        event_label: "open_from_header",
      });
      setIsMeetingRequestsModalOpen(true);
      markMeetingEventsRead({ mark_all: true }).catch((error) => {
        console.error("Error marking meeting request events as read:", error);
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("meetingRequests");
      window.history.replaceState({}, "", url.toString());
    }
  }, [isOwnProfile, isAuthenticated, isVip, meetingRequestsEnabled, searchParams]);

  useEffect(() => {
    if (!isMeetingCalendarModalOpen || approvedMeetingCalendarEvents.length === 0) {
      return;
    }

    const container = meetingCalendarContainerRef.current;
    if (!container) {
      return;
    }

    targetMeetingEventRef.current = null;

    const findScrollable = (rootContainer: HTMLDivElement) => {
      const root = rootContainer.querySelector("[data-testid='ilamy-calendar']") ?? rootContainer;
      const selectors = [
        "[data-testid='vertical-grid-scroll']",
        "[data-testid='horizontal-grid-scroll']",
        ".overflow-y-auto, .overflow-auto",
      ];

      for (const selector of selectors) {
        const candidate = root.querySelector<HTMLElement>(selector);
        if (candidate && candidate.scrollHeight > candidate.clientHeight) {
          return candidate;
        }
      }

      return null;
    };

    const targetMinutesFromMidnight = meetingCalendarAutoScrollTarget
      ? (() => {
          const date = new Date(meetingCalendarAutoScrollTarget.start);
          if (Number.isNaN(date.getTime())) {
            return 10 * 60;
          }
          return date.getHours() * 60 + date.getMinutes();
        })()
      : 10 * 60;

    const MAX_ATTEMPTS = 120;
    let rafId: number | null = null;
    let attempts = 0;

    const tick = () => {
      attempts += 1;

      if (meetingCalendarAutoScrollTarget && targetMeetingEventRef.current) {
        targetMeetingEventRef.current.scrollIntoView({
          block: "center",
          inline: "nearest",
        });
        return;
      }

      const scrollable = findScrollable(container);
      if (scrollable) {
        const pxPerHour = 60;
        const scrollTop = Math.max(0, (targetMinutesFromMidnight / 60) * pxPerHour - 40);
        scrollable.scrollTop = Math.min(scrollTop, scrollable.scrollHeight - scrollable.clientHeight);
        return;
      }

      if (attempts < MAX_ATTEMPTS) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isMeetingCalendarModalOpen, approvedMeetingCalendarEvents, meetingCalendarAutoScrollTarget]);

  return {
    isMeetingRequestsModalOpen,
    setIsMeetingRequestsModalOpen,
    isMeetingCalendarModalOpen,
    setIsMeetingCalendarModalOpen,
    isMeetingDetailsModalOpen,
    setIsMeetingDetailsModalOpen,
    selectedMeetingFromCalendar,
    setSelectedMeetingFromCalendar,
    isOpeningMeetingChat,
    showMeetingDetailsChatProModal,
    setShowMeetingDetailsChatProModal,
    showMeetingDetailsChatAuthModal,
    setShowMeetingDetailsChatAuthModal,
    meetingRequests,
    isLoadingMeetingRequests,
    meetingRequestsError,
    meetingCalendarContainerRef,
    targetMeetingEventRef,
    actingMeetingRequest,
    rescheduleDrafts,
    setRescheduleDrafts,
    canRequestMeeting,
    sharedEventsForMeeting,
    isProfileMeetingModalOpen,
    setIsProfileMeetingModalOpen,
    showProfileMeetingProModal,
    setShowProfileMeetingProModal,
    showProfileMeetingAuthModal,
    setShowProfileMeetingAuthModal,
    actionNeededMeetingRequestsCount,
    upcomingMeetingRequestsCount,
    approvedMeetingCalendarEvents,
    meetingCalendarAutoScrollTarget,
    meetingCalendarInitialDate,
    fetchMeetingRequestsList,
    handleOpenMeetingRequestsModal,
    handleOpenMeetingCalendarModal,
    handleOpenMeetingDetailsFromCalendar,
    handleCloseMeetingDetailsModal,
    handleOpenMeetingDetailsChat,
    handleOpenProfileMeetingRequest,
    handleApproveMeetingRequest,
    handleRejectMeetingRequest,
    handleToggleReschedule,
    handleSubmitReschedule,
    currentAuthUserId,
  };
}
