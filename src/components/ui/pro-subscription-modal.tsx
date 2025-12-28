"use client";

import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent, Button } from "@/components/ui";
import Link from "next/link";

interface ProSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function ProSubscriptionModal({
  isOpen,
  onClose,
  title = "This feature is available only with PRO subscription",
  description = "Upgrade to PRO to unlock this feature and many more.",
}: ProSubscriptionModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>{title}</ModalTitle>
        <ModalDescription>{description}</ModalDescription>
      </ModalHeader>
      <ModalContent>
        <div className="flex flex-col gap-3">
          <Button variant="primary" className="w-full" asChild>
            <Link href="/subscription" onClick={onClose}>
              Buy PRO subscription now
            </Link>
          </Button>
          <Button variant="outline" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}

