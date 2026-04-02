"use client";

import { Modal, ModalContent, ModalHeader, ModalTitle, UserListItem } from "@/components/ui";
import type { DirectoryUser, FriendshipStatus } from "@/types/profile";

export interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  ariaLabel: string;
  users: DirectoryUser[];
  emptyText?: string;
  friendStatuses?: Record<string, FriendshipStatus>;
  defaultFriendStatus?: FriendshipStatus;
  onAddFriend?: (userId: string) => void;
  sendingFriendRequest?: Record<string, boolean>;
  creatingChat?: Record<string, boolean>;
}

export function UserListModal({
  isOpen,
  onClose,
  title,
  ariaLabel,
  users,
  emptyText = "No users found",
  friendStatuses,
  defaultFriendStatus = "none",
  onAddFriend,
  sendingFriendRequest,
  creatingChat,
}: UserListModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" ariaLabel={ariaLabel}>
      <ModalHeader>
        <ModalTitle>{title}</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {users.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">{emptyText}</p>
          ) : (
            users.map((member) => (
              <UserListItem
                key={member.id}
                member={member}
                friendStatus={friendStatuses?.[member.id] || defaultFriendStatus}
                onAddFriend={onAddFriend}
                sendingFriendRequest={Boolean(sendingFriendRequest?.[member.id])}
                creatingChat={Boolean(creatingChat?.[member.id])}
              />
            ))
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
