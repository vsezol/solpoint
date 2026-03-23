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

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  requirePro?: boolean;
  redirectTo?: string;
}

export function AuthRequiredModal({
  isOpen,
  onClose,
  title,
  description,
  requirePro = false,
  redirectTo,
}: AuthRequiredModalProps) {
  const defaultTitle = requirePro
    ? "This feature is available only for Pro users"
    : "This feature is available only for logged-in users";

  const defaultDescription = requirePro
    ? "Please upgrade to Pro subscription to access this feature."
    : "Please sign up or log in to use this feature.";

  const withRedirect = (basePath: string) => {
    if (!redirectTo) return basePath;
    const query = new URLSearchParams({ redirect_to: redirectTo });
    return `${basePath}?${query.toString()}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" className={modalClass} closeButtonClassName={closeButtonClass}>
      <ModalHeader className={headerClass}>
        <ModalTitle style={titleStyle}>{title || defaultTitle}</ModalTitle>
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
                <Link href={withRedirect("/signup")} onClick={onClose}>
                  Sign up
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={withRedirect("/login")} onClick={onClose}>
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
