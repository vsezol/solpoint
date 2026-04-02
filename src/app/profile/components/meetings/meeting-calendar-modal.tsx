"use client";

import type { RefObject } from "react";
import { IlamyCalendar, type CalendarEvent } from "@ilamy/calendar";
import { Loader2 } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui";
import type { MeetingCalendarEvent } from "../../hooks/use-profile-meeting-requests";

interface MeetingCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoadingMeetingRequests: boolean;
  meetingRequestsError: string | null;
  approvedMeetingCalendarEvents: MeetingCalendarEvent[];
  meetingCalendarInitialDate?: string;
  meetingCalendarAutoScrollTargetId?: string;
  meetingCalendarContainerRef: RefObject<HTMLDivElement | null>;
  targetMeetingEventRef: RefObject<HTMLDivElement | null>;
  onEventClick: (event: CalendarEvent) => void;
}

export function MeetingCalendarModal({
  isOpen,
  onClose,
  isLoadingMeetingRequests,
  meetingRequestsError,
  approvedMeetingCalendarEvents,
  meetingCalendarInitialDate,
  meetingCalendarAutoScrollTargetId,
  meetingCalendarContainerRef,
  targetMeetingEventRef,
  onEventClick,
}: MeetingCalendarModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      className="w-[min(1200px,calc(100vw-2rem))]"
      closeButtonClassName="p-1 [&_svg]:w-4 [&_svg]:h-4"
      ariaLabel="Meeting requests calendar"
    >
      <ModalHeader>
        <ModalTitle>Meetups Calendar</ModalTitle>
      </ModalHeader>
      <ModalContent>
        {isLoadingMeetingRequests ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="w-10 h-10 text-[var(--color-primary)] animate-spin" aria-hidden />
            <p className="text-sm text-[var(--color-text-secondary)]">Loading calendar...</p>
          </div>
        ) : meetingRequestsError ? (
          <p className="text-sm text-[var(--color-error)] text-center py-4">{meetingRequestsError}</p>
        ) : approvedMeetingCalendarEvents.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
            No approved meetups with date and time yet.
          </p>
        ) : (
          <div
            ref={meetingCalendarContainerRef}
            className="solpoint-meeting-calendar h-[min(72vh,760px)] rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)]"
          >
            <IlamyCalendar
              events={approvedMeetingCalendarEvents}
              initialView="week"
              initialDate={meetingCalendarInitialDate}
              firstDayOfWeek="monday"
              timeFormat="24-hour"
              disableCellClick
              disableDragAndDrop
              dayMaxEvents={4}
              eventSpacing={2}
              renderCurrentTimeIndicator={() => null}
              classesOverride={{
                disabledCell: "bg-[var(--color-surface-hover)]/50 text-[var(--color-text-muted)] pointer-events-none",
              }}
              onEventClick={onEventClick}
              renderEvent={(event: CalendarEvent) => {
                const eventId = String(event.id);
                const isTargetEvent = meetingCalendarAutoScrollTargetId === eventId;
                const timeStr = `${event.start.format("HH:mm")}–${event.end.format("HH:mm")}`;
                return (
                  <div
                    ref={isTargetEvent ? targetMeetingEventRef : null}
                    data-meeting-event-id={eventId}
                    className="h-full min-h-0 w-full rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/90 px-1.5 py-1 flex items-center justify-center cursor-pointer overflow-hidden"
                  >
                    <p className="text-[11px] sm:text-xs font-medium text-black leading-tight truncate">{timeStr}</p>
                  </div>
                );
              }}
            />
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
