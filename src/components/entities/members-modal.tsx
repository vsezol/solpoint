"use client";

import { Modal, ModalHeader, ModalTitle, ModalContent, Avatar } from "@/components/ui";
import Link from "next/link";
import type { User } from "@/types";

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: User[];
  title: string;
  entityType: "hub" | "community" | "project" | "workspace" | "event";
}

export function MembersModal({
  isOpen,
  onClose,
  members,
  title,
  entityType,
}: MembersModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>{title}</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {members.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {members.map((member) => (
                <Link
                  key={member.id}
                  href={`/profile/${member.twitter_handle}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <Avatar
                    src={member.avatar_url}
                    alt={member.twitter_name}
                    size="md"
                    isVip={member.subscription_tier === "vip"}
                    isVerified={member.is_verified}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--color-text-primary)] truncate">
                      {member.twitter_name}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)] truncate">
                      @{member.twitter_handle}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-[var(--color-text-muted)] py-8">
              No members found
            </p>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}

