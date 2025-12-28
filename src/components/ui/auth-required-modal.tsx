"use client";

import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent, ModalFooter, Button } from "@/components/ui";
import Link from "next/link";

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  requirePro?: boolean;
}

export function AuthRequiredModal({
  isOpen,
  onClose,
  title,
  description,
  requirePro = false,
}: AuthRequiredModalProps) {
  const defaultTitle = requirePro
    ? "This feature is available only for Pro users"
    : "This feature is available only for logged-in users";
  
  const defaultDescription = requirePro
    ? "Please upgrade to Pro subscription to access this feature."
    : "Please sign up or log in to use this feature.";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>{title || defaultTitle}</ModalTitle>
        <ModalDescription>{description || defaultDescription}</ModalDescription>
      </ModalHeader>
      <ModalContent>
        <div className="space-y-4">
          {requirePro ? (
            <div className="flex flex-col gap-3">
              <Button variant="primary" className="w-full" asChild>
                <Link href="/subscription" onClick={onClose}>
                  Upgrade to Pro
                </Link>
              </Button>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button variant="primary" className="w-full" asChild>
                <Link href="/signup" onClick={onClose}>
                  Sign up
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/login" onClick={onClose}>
                  Log in
                </Link>
              </Button>
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}

