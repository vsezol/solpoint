"use client";

import Image from "next/image";
import Link from "next/link";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui";

export interface AvatarListItem {
  id: string;
  avatar_url?: string | null;
  name: string;
  handle?: string;
}

export interface AvatarListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  ariaLabel: string;
  items: AvatarListItem[];
  emptyText?: string;
  getHref?: (item: AvatarListItem) => string;
}

export function AvatarListModal({
  isOpen,
  onClose,
  title,
  ariaLabel,
  items,
  emptyText = "Nothing to show",
  getHref,
}: AvatarListModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" ariaLabel={ariaLabel}>
      <ModalHeader>
        <ModalTitle>{title}</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">{emptyText}</p>
          ) : (
            items.map((item) => {
              const href = getHref ? getHref(item) : item.handle ? `/profile/${item.handle}` : "#";

              return (
                <Link
                  key={item.id}
                  href={href}
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.avatar_url ? (
                      <Image
                        src={item.avatar_url}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {item.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{item.name}</p>
                    {item.handle && <p className="text-xs text-[var(--color-text-secondary)] truncate">@{item.handle}</p>}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
