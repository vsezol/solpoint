"use client";

import Image from "next/image";
import Link from "next/link";
import { Button, Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui";
import { UserPlus, X } from "lucide-react";
import type { User } from "@/types";

interface ProfileFriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: User[];
  onAccept: (friendId: string) => Promise<void>;
  onDecline: (friendId: string) => Promise<void>;
}

export function ProfileFriendRequestsModal({
  isOpen,
  onClose,
  requests,
  onAccept,
  onDecline,
}: ProfileFriendRequestsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" ariaLabel="Friend requests list">
      <ModalHeader>
        <ModalTitle>Friend Requests</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {requests.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">No friend requests</p>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <Link
                  href={`/profile/${request.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className="w-12 h-12 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {request.avatar_url ? (
                      <Image
                        src={request.avatar_url}
                        alt={request.twitter_name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {request.twitter_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{request.twitter_name}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="primary" size="sm" onClick={() => onAccept(request.id)} className="whitespace-nowrap">
                    <UserPlus className="w-4 h-4 mr-1" />
                    Accept
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onDecline(request.id)} className="whitespace-nowrap">
                    <X className="w-4 h-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
