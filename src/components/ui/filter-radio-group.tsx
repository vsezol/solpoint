"use client";

import { cn } from "@/lib/utils";
import { forwardRef, InputHTMLAttributes } from "react";

export interface FilterRadioOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface FilterRadioGroupProps {
  /** Название группы (для name атрибута) */
  name: string;
  /** Текущее выбранное значение */
  value: string;
  /** Опции для выбора */
  options: FilterRadioOption[];
  /** Обработчик изменения значения */
  onChange: (value: string) => void;
  /** Дополнительные классы */
  className?: string;
  /** Ориентация: горизонтальная или вертикальная */
  orientation?: "horizontal" | "vertical";
}

/**
 * Переиспользуемый компонент для группы radio кнопок в стиле outlined тегов.
 * Использует те же цвета, что и FilterTag.
 */
export const FilterRadioGroup = forwardRef<HTMLDivElement, FilterRadioGroupProps>(
  ({ name, value, options, onChange, className, orientation = "vertical", ...props }, ref) => {
    const containerClasses = cn(
      "flex gap-2",
      orientation === "horizontal" ? "flex-row flex-wrap" : "flex-col",
      className
    );

    return (
      <div ref={ref} className={containerClasses} {...props}>
        {options.map((option) => {
          const isSelected = value === option.value;
          
          return (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                "px-2 py-1 sm:px-4 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors",
                "border",
                isSelected
                  ? "border-[var(--color-filter-border)] bg-[var(--color-filter-bg)] text-[var(--color-text-primary)]"
                  : "border-[var(--color-surface-border)] bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-filter-border)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={(e) => onChange(e.target.value)}
                className="sr-only" // Скрываем стандартный radio, используем визуальный стиль label
              />
              {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    );
  }
);

FilterRadioGroup.displayName = "FilterRadioGroup";



