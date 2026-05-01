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
  variant?: "default" | "compact";
}

export function AuthRequiredModal({
  isOpen,
  onClose,
  title,
  description,
  requirePro = false,
  redirectTo,
  variant = "default",
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

  if (variant === "compact" && !requirePro) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="sm"
        className="!bg-[#0B0B0B] !border-white/[0.14] !rounded-[12px] !p-0"
        closeButtonClassName="!hidden"
      >
        <ModalContent>
          <div className="px-5 pb-5 pt-4" style={{ fontFamily: "var(--font-kode-mono), monospace" }}>
            <div className="text-center text-[20px] font-extrabold leading-snug text-white">
              {title || "Log in or Sign up to continue"}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                className="h-[46px] w-full rounded-[8px] border border-white bg-white text-[20px] font-extrabold text-black hover:bg-white/90"
                asChild
              >
                <Link href={withRedirect("/login")} onClick={onClose}>
                  Log in
                </Link>
              </Button>
              <Link
                href={withRedirect("/signup")}
                onClick={onClose}
                className="group inline-flex h-[46px] w-full items-stretch rounded-[8px] p-px"
                style={{ background: "linear-gradient(90deg, #9b45fe 0%, #00f58d 100%)" }}
              >
                <span className="flex flex-1 items-center justify-center rounded-[7px] bg-black text-[20px] font-extrabold text-white transition-colors group-hover:bg-transparent group-hover:text-black">
                  Sign up
                </span>
              </Link>
            </div>
          </div>
        </ModalContent>
      </Modal>
    );
  }

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
