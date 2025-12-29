"use client";

import { cn } from "@/lib/utils";
import { forwardRef, ButtonHTMLAttributes, HTMLAttributes } from "react";

export interface FilterTagProps {
  /** Содержимое тега */
  children: React.ReactNode;
  /** Активен ли тег */
  isActive?: boolean;
  /** Рендерить как кнопку или div */
  asButton?: boolean;
  /** Дополнительные классы */
  className?: string;
  /** Обработчик клика (только для кнопки) */
  onClick?: () => void;
}

/**
 * Переиспользуемый компонент для фильтров-тегов с outlined стилем.
 * Может использоваться как кнопка или как обычный div.
 */
export const FilterTag = forwardRef<
  HTMLButtonElement | HTMLDivElement,
  FilterTagProps
>(({ children, isActive = false, asButton = true, className, onClick, ...props }, ref) => {
  const baseStyles = cn(
    "px-2 py-1 sm:px-4 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors",
    "border",
    isActive
      ? "border-[var(--color-filter-border)] bg-[var(--color-filter-bg)] text-[var(--color-text-primary)]"
      : "border-[var(--color-surface-border)] bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-filter-border)] hover:text-[var(--color-text-primary)]",
    className
  );

  if (asButton) {
    return (
      <button
        ref={ref as React.ForwardedRef<HTMLButtonElement>}
        className={baseStyles}
        onClick={onClick}
        {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </button>
    );
  }

  return (
    <div
      ref={ref as React.ForwardedRef<HTMLDivElement>}
      className={baseStyles}
      {...(props as HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </div>
  );
});

FilterTag.displayName = "FilterTag";



