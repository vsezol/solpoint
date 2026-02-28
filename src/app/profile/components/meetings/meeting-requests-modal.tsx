"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { Button, Input, Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui";
import { formatMeetingTimeGmt } from "@/lib/utils/timezone";
import type { MeetingRequest } from "@/types";

interface MeetingRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoadingMeetingRequests: boolean;
  meetingRequestsError: string | null;
  meetingRequests: MeetingRequest[];
  currentAuthUserId: string | null;
  actingMeetingRequest: Record<string, boolean>;
  rescheduleDrafts: Record<string, { open: boolean; start_at: string }>;
  setRescheduleDrafts: Dispatch<SetStateAction<Record<string, { open: boolean; start_at: string }>>>;
  onApprove: (requestId: string) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
  onToggleReschedule: (meetingRequest: MeetingRequest) => void;
  onSubmitReschedule: (meetingRequest: MeetingRequest) => Promise<void>;
}

export function MeetingRequestsModal({
  isOpen,
  onClose,
  isLoadingMeetingRequests,
  meetingRequestsError,
  meetingRequests,
  currentAuthUserId,
  actingMeetingRequest,
  rescheduleDrafts,
  setRescheduleDrafts,
  onApprove,
  onReject,
  onToggleReschedule,
  onSubmitReschedule,
}: MeetingRequestsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" ariaLabel="Meeting requests list">
      <ModalHeader>
        <ModalTitle>Meeting Requests</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto">
          {isLoadingMeetingRequests ? (
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">Loading requests...</p>
          ) : meetingRequestsError ? (
            <p className="text-sm text-[var(--color-error)] text-center py-4">{meetingRequestsError}</p>
          ) : (
            (() => {
              const pendingRequests = meetingRequests.filter((r) => r.status === "pending");
              const upcomingMeetups = meetingRequests.filter((r) => r.status === "approved");

              return (
                <>
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Pending requests</h4>
                    {pendingRequests.length === 0 ? (
                      <p className="text-sm text-[var(--color-text-secondary)] py-2">No pending requests</p>
                    ) : (
                      pendingRequests.map((meetingRequest) => {
                        const proposal = meetingRequest.current_proposal;
                        const draft = rescheduleDrafts[meetingRequest.id];
                        const isActing = Boolean(actingMeetingRequest[meetingRequest.id]);
                        const canAct = meetingRequest.needs_action === true;
                        const isInitiator =
                          currentAuthUserId !== null && meetingRequest.requester_id === currentAuthUserId;
                        const initiatorWaiting = isInitiator && !canAct;
                        const eventLink = meetingRequest.event?.slug || meetingRequest.event?.id;

                        return (
                          <div
                            key={meetingRequest.id}
                            className="p-4 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-background)]/40"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <p className="text-sm text-[var(--color-text-primary)] font-medium">
                                  {meetingRequest.counterparty?.twitter_name || "Unknown user"}
                                </p>
                                {meetingRequest.counterparty?.twitter_handle && (
                                  <p className="text-xs text-[var(--color-text-secondary)]">
                                    @{meetingRequest.counterparty.twitter_handle}
                                  </p>
                                )}
                              </div>
                              {meetingRequest.unread_events_count && meetingRequest.unread_events_count > 0 && (
                                <span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
                                  {meetingRequest.unread_events_count}
                                </span>
                              )}
                            </div>

                            {meetingRequest.event && (
                              <p className="text-xs text-[var(--color-text-secondary)] mb-1">
                                Event:{" "}
                                {eventLink ? (
                                  <Link href={`/events/${eventLink}`} className="text-[var(--color-primary)] hover:underline">
                                    {meetingRequest.event.name}
                                  </Link>
                                ) : (
                                  meetingRequest.event.name
                                )}
                              </p>
                            )}

                            {proposal && (
                              <div className="mb-3">
                                <p className="text-xs text-[var(--color-text-secondary)]">
                                  Proposed time:{" "}
                                  <span className="text-[var(--color-text-primary)]">
                                    {formatMeetingTimeGmt(proposal.start_at, proposal.timezone)}
                                  </span>
                                </p>
                                {proposal.place && (
                                  <p className="text-xs text-[var(--color-text-secondary)]">
                                    Place: <span className="text-[var(--color-text-primary)]">{proposal.place}</span>
                                  </p>
                                )}
                                {proposal.message && (
                                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                    Agenda: <span className="text-[var(--color-text-primary)]">{proposal.message}</span>
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2">
                              {canAct && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={isActing}
                                  isLoading={isActing}
                                  onClick={() => onApprove(meetingRequest.id)}
                                >
                                  Approve
                                </Button>
                              )}
                              {(canAct || initiatorWaiting) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isActing}
                                  onClick={() => onReject(meetingRequest.id)}
                                >
                                  {initiatorWaiting ? "Cancel meeting" : "Reject"}
                                </Button>
                              )}
                              {(canAct || initiatorWaiting) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isActing}
                                  onClick={() => onToggleReschedule(meetingRequest)}
                                >
                                  {initiatorWaiting ? "Change time" : "Propose new time"}
                                </Button>
                              )}
                            </div>

                            {draft?.open && (
                              <div className="mt-3 p-3 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)]">
                                <label className="text-xs text-[var(--color-text-secondary)] block mb-1">New start time</label>
                                <Input
                                  type="datetime-local"
                                  value={draft.start_at}
                                  onFocus={(e) => {
                                    const input = e.target as HTMLInputElement;
                                    if (typeof input.showPicker === "function") {
                                      input.showPicker();
                                    }
                                  }}
                                  onChange={(e) =>
                                    setRescheduleDrafts((prev) => ({
                                      ...prev,
                                      [meetingRequest.id]: {
                                        ...prev[meetingRequest.id],
                                        start_at: e.target.value,
                                      },
                                    }))
                                  }
                                  className="w-full"
                                />
                                <div className="mt-2 flex justify-end">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => onSubmitReschedule(meetingRequest)}
                                    disabled={!draft.start_at || isActing}
                                    isLoading={isActing}
                                  >
                                    Send new proposal
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Upcoming meetups</h4>
                    {upcomingMeetups.length === 0 ? (
                      <p className="text-sm text-[var(--color-text-secondary)] py-2">No upcoming meetups</p>
                    ) : (
                      upcomingMeetups.map((meetingRequest) => {
                        const proposal = meetingRequest.current_proposal;
                        const eventLink = meetingRequest.event?.slug || meetingRequest.event?.id;
                        return (
                          <div
                            key={meetingRequest.id}
                            className="p-4 rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-background)]/40"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                  {meetingRequest.counterparty?.twitter_name || "Unknown user"}
                                </p>
                                {meetingRequest.counterparty?.twitter_handle && (
                                  <p className="text-xs text-[var(--color-text-secondary)]">
                                    @{meetingRequest.counterparty.twitter_handle}
                                  </p>
                                )}
                              </div>
                            </div>
                            {meetingRequest.event && (
                              <p className="text-xs text-[var(--color-text-secondary)] mb-1">
                                Event:{" "}
                                {eventLink ? (
                                  <Link href={`/events/${eventLink}`} className="text-[var(--color-primary)] hover:underline">
                                    {meetingRequest.event.name}
                                  </Link>
                                ) : (
                                  meetingRequest.event.name
                                )}
                              </p>
                            )}
                            {proposal && (
                              <div className="mt-2">
                                <p className="text-xs text-[var(--color-text-secondary)]">
                                  Time:{" "}
                                  <span className="text-[var(--color-text-primary)]">
                                    {formatMeetingTimeGmt(proposal.start_at, proposal.timezone)}
                                  </span>
                                </p>
                                {proposal.place && (
                                  <p className="text-xs text-[var(--color-text-secondary)]">
                                    Place: <span className="text-[var(--color-text-primary)]">{proposal.place}</span>
                                  </p>
                                )}
                                {proposal.message && (
                                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                    Agenda: <span className="text-[var(--color-text-primary)]">{proposal.message}</span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </section>
                </>
              );
            })()
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
