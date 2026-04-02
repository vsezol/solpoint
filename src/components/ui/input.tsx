"use client";

import { cn } from "@/lib/utils";
import { formControlFocusClasses } from "./form-control-focus";
import { forwardRef, InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, error, type = "text", ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "w-full h-10 px-3 bg-[var(--color-surface)] border border-[var(--color-surface-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
            !error && formControlFocusClasses,
            "selection:bg-[var(--color-primary)] selection:text-white",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            icon && "pl-10",
            error &&
              "transition-[border-color] duration-200 ease-out focus:outline-none border-[var(--color-error)] focus:border-[var(--color-error)]",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-[var(--color-error)]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };

