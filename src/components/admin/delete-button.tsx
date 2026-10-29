"use client";

import { useFormStatus } from "react-dom";
import { Trash2 } from "@/components/ui/icons";

export function DeleteButton({ label, confirm }: { label: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold text-danger transition-opacity hover:opacity-80 disabled:opacity-50"
    >
      <Trash2 aria-hidden className="size-4" />
      <span className="sr-only sm:not-sr-only">{label}</span>
    </button>
  );
}
