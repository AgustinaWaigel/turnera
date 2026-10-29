"use client";

import { useId } from "react";

type Props = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  multiline?: boolean;
  maxLength?: number;
  className?: string;
};

export function Field({ label, hint, error, optional, multiline, className, onChange, ...input }: Props) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const base =
    "w-full rounded-xl border bg-paper px-4 py-3 text-base text-ink transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-ink-soft/80 focus:border-lacquer focus:shadow-[0_0_0_3px_var(--lacquer-wash)] aria-invalid:border-danger";
  const border = error ? "border-danger" : "border-line-strong";

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-2 text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-ink-soft">(opcional)</span>}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${base} ${border} resize-y`}
          onChange={(e) => onChange(e.target.value)}
          {...input}
        />
      ) : (
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${base} ${border}`}
          onChange={(e) => onChange(e.target.value)}
          {...input}
        />
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
