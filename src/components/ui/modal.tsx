"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useCallback, HTMLAttributes, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "full" | "auto";
  variant?: "default" | "centered" | "bottom-sheet";
  preventBodyScroll?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full mx-4",
  auto: "max-w-auto",
};

export function Modal({
  isOpen,
  onClose,
  children,
  className,
  overlayClassName,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  size = "md",
  variant = "default",
  preventBodyScroll = true,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape && isOpen) {
        onClose();
      }
    },
    [onClose, closeOnEscape, isOpen]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      if (preventBodyScroll) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = "hidden";
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      if (preventBodyScroll) {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      }
    };
  }, [isOpen, handleEscape, preventBodyScroll]);

  // Фокус на модальном окне при открытии
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  const isBottomSheet = variant === "bottom-sheet";
  const isCentered = variant === "centered" || variant === "default";

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute inset-0 bg-black/60 backdrop-blur-sm",
              overlayClassName
            )}
            onClick={closeOnOverlayClick ? onClose : undefined}
            aria-hidden="true"
          />

          {/* Content */}
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={
              isBottomSheet
                ? { opacity: 0, y: "100%" }
                : { opacity: 0, scale: 0.95, y: 10 }
            }
            animate={
              isBottomSheet
                ? { opacity: 1, y: 0 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              isBottomSheet
                ? { opacity: 0, y: "100%" }
                : { opacity: 0, scale: 0.95, y: 10 }
            }
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "relative bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl shadow-2xl shadow-black/40 max-h-[90vh] overflow-auto",
              isBottomSheet && "rounded-t-2xl rounded-b-none max-h-[85vh] mt-auto",
              isCentered && size !== "full" && size !== "auto" && sizeClasses[size],
              isCentered && "w-full",
              isBottomSheet && "w-full",
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {showCloseButton && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  showBorder?: boolean;
}

export function ModalHeader({
  className,
  showBorder = true,
  ...props
}: ModalHeaderProps) {
  return (
    <div
      className={cn(
        "px-6 pt-6 pb-4",
        showBorder && "border-b border-[var(--color-surface-border)]",
        className
      )}
      {...props}
    />
  );
}

export interface ModalTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export function ModalTitle({
  className,
  as: Component = "h2",
  ...props
}: ModalTitleProps) {
  return (
    <Component
      className={cn(
        "text-xl font-semibold text-[var(--color-text-primary)]",
        className
      )}
      {...props}
    />
  );
}

export function ModalDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-sm text-[var(--color-text-secondary)] mt-1",
        className
      )}
      {...props}
    />
  );
}

export function ModalContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-4", className)} {...props} />;
}

export interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {
  showBorder?: boolean;
  align?: "left" | "center" | "right" | "between";
}

export function ModalFooter({
  className,
  showBorder = true,
  align = "right",
  ...props
}: ModalFooterProps) {
  const alignClasses = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
    between: "justify-between",
  };

  return (
    <div
      className={cn(
        "px-6 py-4 flex items-center gap-3",
        showBorder && "border-t border-[var(--color-surface-border)]",
        alignClasses[align],
        className
      )}
      {...props}
    />
  );
}

