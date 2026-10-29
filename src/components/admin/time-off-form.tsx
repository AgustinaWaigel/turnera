"use client";

import { addTimeOff } from "@/app/admin/actions";
import { useFormAction } from "./use-form-action";
import { inputClass, primaryButton } from "./ui";

export function TimeOffForm() {
  const { state, pending, formProps } = useFormAction(addTimeOff, { resetOnSuccess: true });
  return (
    <form {...formProps} className="grid gap-4 sm:grid-cols-4">
      <label className="sm:col-span-1">
        <span className="mb-1.5 block text-sm font-semibold">Desde el día</span>
        <input name="from_date" type="date" required className={`${inputClass} tabular`} />
      </label>
      <label className="sm:col-span-1">
        <span className="mb-1.5 block text-sm font-semibold">
          Hora <span className="font-normal text-ink-soft">(opcional)</span>
        </span>
        <input name="from_time" type="time" className={`${inputClass} tabular`} />
      </label>
      <label className="sm:col-span-1">
        <span className="mb-1.5 block text-sm font-semibold">Hasta el día</span>
        <input name="to_date" type="date" className={`${inputClass} tabular`} />
      </label>
      <label className="sm:col-span-1">
        <span className="mb-1.5 block text-sm font-semibold">
          Hora <span className="font-normal text-ink-soft">(opcional)</span>
        </span>
        <input name="to_time" type="time" className={`${inputClass} tabular`} />
      </label>
      <label className="sm:col-span-4">
        <span className="mb-1.5 block text-sm font-semibold">
          Motivo <span className="font-normal text-ink-soft">(solo lo ves vos)</span>
        </span>
        <input name="reason" maxLength={120} placeholder="Vacaciones" className={inputClass} />
      </label>
      <p className="text-sm text-ink-soft sm:col-span-4">Sin horas, se bloquean los días completos.</p>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-4">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Guardando…" : "Bloquear"}
        </button>
        {state.error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
