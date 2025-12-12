"use client";

import { cn } from "@/lib/utils";
import { forwardRef, ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary:
        "bg-[var(--color-primary)] text-[var(--color-background)] hover:bg-[var(--color-primary-hover)] focus-visible:ring-[var(--color-primary)]",
      secondary:
        "bg-[var(--color-secondary)] text-white hover:bg-[var(--color-secondary-hover)] focus-visible:ring-[var(--color-secondary)]",
      outline:
        "border border-[var(--color-surface-border)] bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] focus-visible:ring-[var(--color-primary)]",
      ghost:
        "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-primary)]",
      danger:
        "bg-[var(--color-error)] text-white hover:bg-red-600 focus-visible:ring-[var(--color-error)]",
    };

    const sizes = {
      sm: "h-8 px-3 text-sm gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };

