"use client";

import type { CSSProperties } from "react";
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent, Button } from "@/components/ui";
import Link from "next/link";

const modalClass = "!bg-[#101319] !border-white/[0.08] !rounded-[10px]";
const headerClass = "!border-white/[0.08]";
const titleStyle: CSSProperties = {
  fontFamily: "var(--font-kode-mono), monospace",
  fontWeight: 600,
  fontSize: 15,
  lineHeight: 1,
};
const closeButtonClass = "!text-white/40 hover:!text-white hover:!bg-white/10 !rounded-[5px]";

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
    <Modal isOpen={isOpen} onClose={onClose} size="md" className={modalClass} closeButtonClassName={closeButtonClass}>
      <ModalHeader className={headerClass}>
        <ModalTitle style={titleStyle}>{title}</ModalTitle>
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

