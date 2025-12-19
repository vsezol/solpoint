"use client";

import { cn } from "@/lib/utils";
import { forwardRef, InputHTMLAttributes } from "react";

export interface CheckBoxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Текст метки */
  label: string;
  /** Иконка слева от текста (опционально) */
  icon?: React.ReactNode;
  /** Тип: checkbox или radio */
  type?: "checkbox" | "radio";
  /** Дополнительные классы для контейнера */
  containerClassName?: string;
  /** Дополнительные классы для label */
  labelClassName?: string;
}

/**
 * Переиспользуемый компонент CheckBox/Radio.
 * Простая строка с кружком/квадратом слева, иконкой (опционально) и текстом.
 * Без border и фона - просто строка с индикатором выбора.
 */
export const CheckBox = forwardRef<HTMLInputElement, CheckBoxProps>(
  ({ label, icon, type = "checkbox", containerClassName, labelClassName, className, ...props }, ref) => {
    return (
      <label
        className={cn(
          "flex items-center gap-3 cursor-pointer",
          containerClassName
        )}
      >
        {/* Кастомный индикатор выбора */}
        <div className="flex-shrink-0 relative">
          <input
            ref={ref}
            type={type}
            className={cn("sr-only", className)} // Скрываем стандартный input
            {...props}
          />
          {/* Визуальный индикатор */}
          {type === "radio" ? (
            // Radio кружок
            <div
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-colors",
                props.checked
                  ? "border-[var(--color-filter-border)]"
                  : "border-[var(--color-surface-border)]"
              )}
            >
              {/* Точка в центре, если выбран */}
              {props.checked && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-filter-border)]" />
                </div>
              )}
            </div>
          ) : (
            // Checkbox квадрат
            <div
              className={cn(
                "w-4 h-4 rounded border-2 transition-colors flex items-center justify-center",
                props.checked
                  ? "border-[var(--color-filter-border)] bg-[var(--color-filter-bg)]"
                  : "border-[var(--color-surface-border)] bg-transparent"
              )}
            >
              {/* Галочка, если выбран */}
              {props.checked && (
                <svg
                  className="w-3 h-3 text-[var(--color-filter-border)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Иконка (опционально) */}
        {icon && <span className="flex-shrink-0">{icon}</span>}

        {/* Текст */}
        <span className={cn("text-sm text-[var(--color-text-secondary)]", labelClassName)}>
          {label}
        </span>
      </label>
    );
  }
);

CheckBox.displayName = "CheckBox";

