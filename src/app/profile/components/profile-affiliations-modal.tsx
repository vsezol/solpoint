"use client";

import Image from "next/image";
import Link from "next/link";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui";
import type { ProfileAffiliation } from "@/types/profile";
import { getEntityLink } from "@/lib/utils/entity-links";

interface ProfileAffiliationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOwnProfile: boolean;
  affiliations: ProfileAffiliation[];
  onUpgradeClick?: () => void;
}

export function ProfileAffiliationsModal({
  isOpen,
  onClose,
  isOwnProfile,
  affiliations,
}: ProfileAffiliationsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" ariaLabel="Affiliations list">
      <ModalHeader>
        <ModalTitle>{isOwnProfile ? "Your Affiliations" : "Affiliations"}</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {affiliations.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">No affiliations</p>
          ) : (
            affiliations.map((affiliation) => (
              <Link
                key={affiliation.id}
                href={getEntityLink({ type: affiliation.type, slug: affiliation.slug, id: affiliation.id })}
                onClick={onClose}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--color-surface-hover)] border-2 border-[var(--color-background)] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {affiliation.image_url ? (
                    <Image
                      src={affiliation.image_url}
                      alt={affiliation.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                      {affiliation.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{affiliation.name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] truncate capitalize">
                    {affiliation.type}
                    {affiliation.city && ` • ${affiliation.city}`}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
