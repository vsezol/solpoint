"use client";

import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui";
import { CreateEntityForm } from "@/components/hubs/create-entity-form";
import type { EntityType } from "@/types";

interface ProfileCreateEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  createEntityType: EntityType;
  setCreateEntityType: (type: EntityType) => void;
  onSuccess: (entity: { id: string; slug: string; type: EntityType }) => void;
}

const ENTITY_TYPES: EntityType[] = ["hub", "community", "project", "workspace"];

export function ProfileCreateEntityModal({
  isOpen,
  onClose,
  createEntityType,
  setCreateEntityType,
  onSuccess,
}: ProfileCreateEntityModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" variant="centered">
      <ModalHeader>
        <ModalTitle>Create Hub, Community, Project, or Workspace</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Select Type <span className="text-[var(--color-error)]">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ENTITY_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setCreateEntityType(type)}
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  createEntityType === type
                    ? "bg-[var(--color-primary)] text-[var(--color-background)] border-[var(--color-primary)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-surface-border)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                {type[0].toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <CreateEntityForm entityType={createEntityType} onSuccess={onSuccess} onCancel={onClose} />
      </ModalContent>
    </Modal>
  );
}
