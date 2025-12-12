"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useCallback, HTMLAttributes } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) {
        onClose();
      }
    },
    [onClose, closeOnEscape]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "relative bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-xl shadow-2xl shadow-black/40 max-h-[90vh] overflow-auto",
              className
            )}
          >
            {showCloseButton && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
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

export function ModalHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-6 pt-6 pb-4 border-b border-[var(--color-surface-border)]",
        className
      )}
      {...props}
    />
  );
}

export function ModalTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-xl font-semibold text-[var(--color-text-primary)]",
        className
      )}
      {...props}
    />
  );
}

export function ModalContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-4", className)} {...props} />;
}

export function ModalFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-6 py-4 border-t border-[var(--color-surface-border)] flex items-center justify-end gap-3",
        className
      )}
      {...props}
    />
  );
}

