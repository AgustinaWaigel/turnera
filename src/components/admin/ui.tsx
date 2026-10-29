import type { AppointmentStatus } from "@/lib/types";

export const statusMeta: Record<AppointmentStatus, { label: string; tone: string }> = {
  pending: { label: "Por confirmar", tone: "bg-warn-wash text-warn" },
  confirmed: { label: "Confirmado", tone: "bg-ok-wash text-ok" },
  cancelled: { label: "Cancelado", tone: "bg-danger-wash text-danger" },
  completed: { label: "Realizado", tone: "bg-lacquer-wash text-lacquer-strong" },
  no_show: { label: "No vino", tone: "bg-danger-wash text-danger" },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const m = statusMeta[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.tone}`}>{m.label}</span>;
}

export function PageTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-10">
      <h1 className="font-display text-4xl leading-tight font-bold tracking-[-0.03em] sm:text-5xl">{title}</h1>
      {description && <p className="mt-2 max-w-[60ch] text-ink-soft">{description}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line-strong bg-paper px-3.5 py-2.5 outline-none transition-[border-color,box-shadow] focus:border-lacquer focus:shadow-[0_0_0_3px_var(--lacquer-wash)]";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-lacquer px-5 py-2.5 font-display font-semibold text-on-lacquer transition-colors hover:bg-lacquer-strong disabled:opacity-50";

export const quietButton =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-line-strong px-3.5 py-1.5 text-sm font-semibold transition-colors hover:border-ink disabled:opacity-50";
