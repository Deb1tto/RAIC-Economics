"use client";

import type { ReactNode } from "react";

type Option<T> = { value: T; label: ReactNode; disabled?: boolean };

export function ButtonGroup<T extends string | number, M extends boolean = false>({
  value,
  onChange,
  options,
  className,
  multiple,
}: {
  value: M extends true ? T[] : T;
  onChange: (next: M extends true ? T[] : T) => void;
  options: Option<T>[];
  className?: string;
  multiple?: M;
}) {
  const handleSelect = (optionValue: T) => {
    if (multiple && Array.isArray(value)) {
      const next = value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue];
      onChange(next as any);
    } else {
      onChange(optionValue as any);
    }
  };

  return (
    <div role={multiple ? "group" : "radiogroup"} className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      {options.map((option) => {
        const selected =
          multiple && Array.isArray(value) ? value.includes(option.value) : (option.value as any) === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={selected}
            disabled={option.disabled}
            onClick={() => !option.disabled && handleSelect(option.value)}
            className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              selected
                ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow"
                : option.disabled
                  ? "border-[var(--line)] bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "border-[var(--line)] bg-white/80 text-[var(--ink)] hover:border-[var(--accent)]/40"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
