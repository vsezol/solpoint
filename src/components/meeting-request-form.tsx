"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  TimezoneSelect,
} from "@/components/ui";
import { createMeetingRequest } from "@/lib/api/meeting-requests";
import { isValidIanaTimezone } from "@/lib/utils/timezone";

export interface MeetingEventContext {
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  resolvedTimezone?: string | null;
  eventStartAt?: string | null;
}

export interface MeetingEventOption extends MeetingEventContext {
  id: string;
  name: string;
  slug: string | null;
}

const EMPTY_SHARED_EVENTS: MeetingEventOption[] = [];

interface MeetingRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: string;
    name: string;
    subtitle?: string;
  };
  eventId?: string | null;
  eventContext?: MeetingEventContext | null;
  sharedEvents?: MeetingEventOption[];
  defaultEventId?: string | null;
  onSuccess?: (payload: { eventId: string }) => void;
  onCancel?: () => void;
}

function toLocalDateTimeInput(value: Date): string {
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function getInitialStartAt(input: string | null | undefined): string {
  if (!input) {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    return toLocalDateTimeInput(start);
  }

  const eventDate = new Date(input);
  if (Number.isNaN(eventDate.getTime())) {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    return toLocalDateTimeInput(start);
  }

  return toLocalDateTimeInput(eventDate);
}

function getInitialEventId(params: {
  sharedEvents: MeetingEventOption[];
  defaultEventId?: string | null;
  fallbackEventId?: string | null;
}): string | null {
  const { sharedEvents, defaultEventId, fallbackEventId } = params;
  if (sharedEvents.length === 0) {
    return fallbackEventId ?? null;
  }

  if (defaultEventId && sharedEvents.some((event) => event.id === defaultEventId)) {
    return defaultEventId;
  }

  return sharedEvents[0]?.id ?? null;
}

export function MeetingRequestForm({
  isOpen,
  onClose,
  targetUser,
  eventId = null,
  eventContext = null,
  sharedEvents = EMPTY_SHARED_EVENTS,
  defaultEventId = null,
  onSuccess,
  onCancel,
}: MeetingRequestFormProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [meetingStartAt, setMeetingStartAt] = useState("");
  const [meetingDurationMinutes, setMeetingDurationMinutes] = useState<10 | 20 | 30>(30);
  const [manualTimezone, setManualTimezone] = useState("");
  const [resolvedTimezone, setResolvedTimezone] = useState<string | null>(null);
  const [isResolvingTimezone, setIsResolvingTimezone] = useState(false);
  const [hasAttemptedCoordsResolution, setHasAttemptedCoordsResolution] = useState(false);
  const [meetingPlace, setMeetingPlace] = useState("");
  const [meetingMessage, setMeetingMessage] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedEvent = useMemo(
    () => sharedEvents.find((event) => event.id === selectedEventId) || sharedEvents[0] || null,
    [sharedEvents, selectedEventId]
  );

  const activeEventId = sharedEvents.length > 0 ? selectedEvent?.id ?? null : eventId;
  const activeEventContext = sharedEvents.length > 0 ? selectedEvent : eventContext;
  const activeResolvedTimezone = activeEventContext?.resolvedTimezone ?? null;
  const activeTimezone = activeEventContext?.timezone ?? null;
  const activeLatitude = activeEventContext?.latitude ?? null;
  const activeLongitude = activeEventContext?.longitude ?? null;
  const needsCoordsResolution =
    !isValidIanaTimezone(activeResolvedTimezone) &&
    !isValidIanaTimezone(activeTimezone) &&
    activeLatitude != null &&
    activeLongitude != null;
  const showTimezoneLoading = needsCoordsResolution && (isResolvingTimezone || !hasAttemptedCoordsResolution);
  const hasContextTimezone = isValidIanaTimezone(activeResolvedTimezone) || isValidIanaTimezone(activeTimezone);
  const showTimezoneSkeleton =
    showTimezoneLoading || (hasContextTimezone && !resolvedTimezone && !manualTimezone);
  const timezoneToSubmit = (resolvedTimezone ?? manualTimezone).trim();

  useEffect(() => {
    if (!isOpen) return;

    setSelectedEventId(
      getInitialEventId({
        sharedEvents,
        defaultEventId,
        fallbackEventId: eventId,
      })
    );
    const initialEvent = sharedEvents.length > 0
      ? sharedEvents.find((event) => event.id === getInitialEventId({
          sharedEvents,
          defaultEventId,
          fallbackEventId: eventId,
        })) || sharedEvents[0]
      : eventContext;
    setMeetingStartAt(getInitialStartAt(initialEvent?.eventStartAt ?? null));
    setMeetingDurationMinutes(30);
    setManualTimezone("");
    setResolvedTimezone(null);
    setHasAttemptedCoordsResolution(false);
    setMeetingPlace("");
    setMeetingMessage("");
    setSubmitError(null);
    setIsSubmitting(false);
  }, [isOpen, sharedEvents, defaultEventId, eventId, eventContext]);

  useEffect(() => {
    if (!isOpen) return;
    if (!selectedEventId || sharedEvents.length === 0) return;
    if (sharedEvents.some((event) => event.id === selectedEventId)) return;

    setSelectedEventId(
      getInitialEventId({
        sharedEvents,
        defaultEventId,
        fallbackEventId: eventId,
      })
    );
  }, [isOpen, selectedEventId, sharedEvents, defaultEventId, eventId]);

  useEffect(() => {
    if (!isOpen) return;
    setManualTimezone("");
    setSubmitError(null);
    setHasAttemptedCoordsResolution(false);
  }, [activeEventId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setMeetingStartAt(getInitialStartAt(activeEventContext?.eventStartAt ?? null));
  }, [isOpen, activeEventId, activeEventContext?.eventStartAt]);

  useEffect(() => {
    if (!isOpen) {
      setResolvedTimezone(null);
      setIsResolvingTimezone(false);
      setHasAttemptedCoordsResolution(false);
      return;
    }

    if (isValidIanaTimezone(activeResolvedTimezone)) {
      setResolvedTimezone(activeResolvedTimezone);
      setIsResolvingTimezone(false);
      setHasAttemptedCoordsResolution(true);
      return;
    }

    if (isValidIanaTimezone(activeTimezone)) {
      setResolvedTimezone(activeTimezone);
      setIsResolvingTimezone(false);
      setHasAttemptedCoordsResolution(true);
      return;
    }

    if (activeLatitude == null || activeLongitude == null) {
      setResolvedTimezone(null);
      setIsResolvingTimezone(false);
      setHasAttemptedCoordsResolution(true);
      return;
    }

    const controller = new AbortController();
    const resolveByCoords = async () => {
      setResolvedTimezone(null);
      setIsResolvingTimezone(true);
      try {
        const response = await fetch(
          `/api/timezone-from-coords?latitude=${encodeURIComponent(String(activeLatitude))}&longitude=${encodeURIComponent(String(activeLongitude))}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          setResolvedTimezone(null);
          return;
        }

        const data = await response.json();
        const timezone = typeof data.timezone === "string" ? data.timezone : null;
        setResolvedTimezone(isValidIanaTimezone(timezone) ? timezone : null);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setResolvedTimezone(null);
      } finally {
        setIsResolvingTimezone(false);
        setHasAttemptedCoordsResolution(true);
      }
    };

    resolveByCoords();
    return () => controller.abort();
  }, [
    isOpen,
    activeResolvedTimezone,
    activeTimezone,
    activeLatitude,
    activeLongitude,
  ]);

  const handleClose = () => {
    onCancel?.();
    onClose();
  };

  const handleSubmit = async () => {
    if (!targetUser.id || !activeEventId) return;

    const startDate = new Date(meetingStartAt);
    if (Number.isNaN(startDate.getTime())) {
      setSubmitError("Start time is invalid.");
      return;
    }

    if (!timezoneToSubmit) {
      setSubmitError("Timezone is required.");
      return;
    }

    const endDate = new Date(startDate.getTime() + meetingDurationMinutes * 60 * 1000);

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await createMeetingRequest({
        event_id: activeEventId,
        responder_id: targetUser.id,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        timezone: timezoneToSubmit,
        message: meetingMessage.trim() || undefined,
        place: meetingPlace.trim() || undefined,
      });

      window.dispatchEvent(new Event("meeting-requests-updated"));
      onSuccess?.({ eventId: activeEventId });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create meeting request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" ariaLabel="Meeting request form">
      <ModalHeader>
        <ModalTitle>Request Meeting</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Send a meeting request to{" "}
            <span className="text-[var(--color-text-primary)] font-medium">{targetUser.name}</span>.
          </p>

          {targetUser.subtitle && (
            <p className="text-xs text-[var(--color-text-muted)]">{targetUser.subtitle}</p>
          )}

          {sharedEvents.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm text-[var(--color-text-secondary)]">Event</label>
              {sharedEvents.length > 1 ? (
                <select
                  value={selectedEventId ?? ""}
                  onChange={(event) => setSelectedEventId(event.target.value || null)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)]"
                >
                  {sharedEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)]">
                  {sharedEvents[0]?.name ?? "—"}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm text-[var(--color-text-secondary)]">Start time</label>
            <Input
              type="datetime-local"
              value={meetingStartAt}
              onChange={(event) => setMeetingStartAt(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[var(--color-text-secondary)]">Duration</label>
            <div className="flex gap-2">
              {([10, 20, 30] as const).map((minutes) => (
                <Button
                  key={minutes}
                  type="button"
                  variant={meetingDurationMinutes === minutes ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setMeetingDurationMinutes(minutes)}
                  disabled={isSubmitting}
                >
                  {minutes} min
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2 min-h-[88px]">
            <label className="text-sm text-[var(--color-text-secondary)]">Timezone</label>
            {showTimezoneSkeleton ? (
              <div className="space-y-2">
                <div
                  className="h-10 rounded-lg bg-[var(--color-surface)] border border-[var(--color-surface-border)] animate-pulse flex items-center px-3"
                  aria-busy="true"
                  aria-label="Loading timezone"
                >
                  <span className="h-4 w-32 rounded bg-[var(--color-surface-hover)]" />
                </div>
                {showTimezoneLoading && (
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Resolving timezone from event coordinates...
                  </p>
                )}
              </div>
            ) : resolvedTimezone ? (
              <div className="h-10 px-3 flex items-center rounded-lg bg-[var(--color-surface)] border border-[var(--color-surface-border)] text-[var(--color-text-primary)]">
                {resolvedTimezone}
              </div>
            ) : (
              <TimezoneSelect
                value={manualTimezone}
                onChange={setManualTimezone}
                disabled={isSubmitting}
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[var(--color-text-secondary)]">Place</label>
            <Input
              type="text"
              value={meetingPlace}
              onChange={(event) => setMeetingPlace(event.target.value)}
              placeholder="e.g. Main entrance, lobby"
              className="w-full"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[var(--color-text-secondary)]">Agenda</label>
            <textarea
              value={meetingMessage}
              onChange={(event) => setMeetingMessage(event.target.value)}
              rows={3}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="What do you want to discuss?"
            />
          </div>

          {submitError && <p className="text-sm text-[var(--color-error)]">{submitError}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={!meetingStartAt || !activeEventId || !timezoneToSubmit || isResolvingTimezone}
            >
              Send request
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
