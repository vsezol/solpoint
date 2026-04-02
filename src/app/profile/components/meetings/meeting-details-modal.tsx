"use client";

import Image from "next/image";
import Link from "next/link";
import { Button, Modal } from "@/components/ui";
import type { MeetingRequest } from "@/types";
import { isValidIanaTimezone } from "@/lib/utils/timezone";

interface MeetingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMeeting: MeetingRequest | null;
  isOpeningMeetingChat: boolean;
  onOpenChat: () => Promise<void>;
}

const normalizeMeridiem = (value: string) => value.replace(" AM", "am").replace(" PM", "pm");

const formatMeetingDateBadge = (startAt: string, timezone?: string | null) => {
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) {
    return { day: "--", month: "---" };
  }

  const timeZone = isValidIanaTimezone(timezone) ? timezone : "UTC";
  return {
    day: new Intl.DateTimeFormat("en-US", { timeZone, day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("en-US", { timeZone, month: "short" }).format(date).toUpperCase(),
  };
};

const formatMeetingTimeRange = (startAt: string, endAt: string, timezone?: string | null) => {
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "Time not specified";
  }

  const timeZone = isValidIanaTimezone(timezone) ? timezone : "UTC";
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(startDate);
  const startTime = normalizeMeridiem(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(startDate)
  );
  const endTime = normalizeMeridiem(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(endDate)
  );

  return `${weekday} ${startTime} - ${endTime}`;
};

const formatMeetingTimezoneLabel = (startAt: string, timezone?: string | null) => {
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timeZone = isValidIanaTimezone(timezone) ? timezone : "UTC";
  const timezoneParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const gmtOffset = timezoneParts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const displayTimezone = timeZone.replaceAll("_", " ");

  return `(${gmtOffset}) ${displayTimezone}`;
};

export function MeetingDetailsModal({
  isOpen,
  onClose,
  selectedMeeting,
  isOpeningMeetingChat,
  onOpenChat,
}: MeetingDetailsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      preventBodyScroll={false}
      className="w-[min(360px,calc(100vw-1.5rem))] max-h-[min(560px,calc(100vh-1.5rem))] !rounded-2xl p-0 overflow-hidden flex flex-col"
      ariaLabel="Meeting details"
    >
      <div className="bg-[var(--color-background)] flex flex-col min-h-0 max-h-[min(560px,calc(100vh-1.5rem))]">
        <div className="flex justify-end px-4 pt-3 pb-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-[18px] leading-none font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Close
          </button>
        </div>
        {selectedMeeting ? (
          (() => {
            const proposal = selectedMeeting.current_proposal;
            const counterparty = selectedMeeting.counterparty;
            const counterpartyName = counterparty?.twitter_name || "User";
            const hasProposal = Boolean(proposal?.start_at && proposal?.end_at);
            const dateBadge = hasProposal
              ? formatMeetingDateBadge(proposal!.start_at, proposal!.timezone)
              : { day: "--", month: "---" };
            const timeRange = hasProposal
              ? formatMeetingTimeRange(proposal!.start_at, proposal!.end_at, proposal!.timezone)
              : "Time not specified";
            const timezoneLabel = hasProposal
              ? formatMeetingTimezoneLabel(proposal!.start_at, proposal!.timezone)
              : "";
            const place = proposal?.place?.trim();
            const agenda = proposal?.message?.trim();
            const eventLink = selectedMeeting.event?.slug || selectedMeeting.event?.id;
            const title = `Meetup with ${counterpartyName}`;

            return (
              <>
                <div className="px-4 pb-3 text-center flex-shrink-0">
                  <div className="mx-auto mb-2 h-16 w-16 rounded-full border-2 border-[var(--color-surface-border)] bg-[var(--color-surface)] overflow-hidden relative">
                    {counterparty?.avatar_url ? (
                      <Image src={counterparty.avatar_url} alt={counterpartyName} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-semibold text-[var(--color-text-primary)]">
                        {counterpartyName[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <h3 className="text-base leading-tight font-semibold text-[var(--color-text-primary)]">{title}</h3>
                </div>

                <div className="border-t border-[var(--color-surface-border)] p-[30px] flex-1 flex flex-col min-h-0 overflow-y-auto">
                  <div className="space-y-3">
                    <div className="grid grid-cols-[56px_1fr] gap-x-3 items-start">
                      <div className="text-left">
                        <p className="text-2xl leading-none font-light text-[var(--color-text-primary)]">{dateBadge.day}</p>
                        <p className="text-sm leading-none mt-0.5 font-medium tracking-wide text-[var(--color-text-primary)]">
                          {dateBadge.month}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm leading-snug font-normal text-[var(--color-text-primary)]">{timeRange}</p>
                        {timezoneLabel && <p className="text-xs leading-snug font-normal mt-1 text-[#B7B7B7]">{timezoneLabel}</p>}
                      </div>
                    </div>

                    {selectedMeeting.event?.name && (
                      <div className="grid grid-cols-[56px_1fr] gap-x-3 items-start">
                        <p className="text-sm leading-snug font-semibold text-[var(--color-text-primary)] text-left">Event</p>
                        <p className="text-sm leading-snug font-normal text-[#B7B7B7] break-words">
                          {eventLink ? (
                            <Link href={`/events/${eventLink}`} onClick={onClose} className="hover:text-[var(--color-primary)] transition-colors">
                              {selectedMeeting.event.name}
                            </Link>
                          ) : (
                            selectedMeeting.event.name
                          )}
                        </p>
                      </div>
                    )}

                    {place && (
                      <div className="grid grid-cols-[56px_1fr] gap-x-3 items-start">
                        <p className="text-sm leading-snug font-semibold text-[var(--color-text-primary)] text-left">Place</p>
                        <p className="text-sm leading-snug font-normal text-[#B7B7B7] break-words">{place}</p>
                      </div>
                    )}

                    {agenda && (
                      <div className="grid grid-cols-[56px_1fr] gap-x-3 items-start">
                        <p className="text-sm leading-snug font-semibold text-[var(--color-text-primary)] text-left">Agenda</p>
                        <p className="text-sm leading-snug font-normal text-[#B7B7B7] break-words">{agenda}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 flex flex-col items-center flex-shrink-0">
                    <p className="text-[18px] leading-snug font-medium text-[var(--color-text-primary)] mb-2">Need to chat?</p>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={onOpenChat}
                      isLoading={isOpeningMeetingChat}
                      disabled={isOpeningMeetingChat || !counterparty?.id}
                      className="w-[223px] h-[41px] px-6 text-[15px] font-medium rounded-[12px] border border-[#000000]"
                      style={{ backgroundColor: "#00F68B", color: "#000000" }}
                    >
                      Message {counterpartyName}
                    </Button>
                  </div>
                </div>
              </>
            );
          })()
        ) : (
          <div className="px-4 pb-4">
            <p className="text-[var(--color-text-secondary)] text-center py-4 text-sm">Meeting details are unavailable.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
