"use client";

import { addWorkingHour } from "@/app/admin/actions";
import { useFormAction } from "./use-form-action";
import { Plus } from "@/components/ui/icons";
import { quietButton } from "./ui";

const timeInput =
  "tabular w-32 rounded-xl border border-line-strong bg-paper px-3 py-1.5 outline-none transition-[border-color,box-shadow] focus:border-lacquer focus:shadow-[0_0_0_3px_var(--lacquer-wash)]";

export function HourForm({ weekday }: { weekday: number }) {
  const { state, pending, formProps } = useFormAction(addWorkingHour);
  return (
    <form {...formProps} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="weekday" value={weekday} />
      <label className="sr-only" htmlFor={`start-${weekday}`}>
        Desde
      </label>
      <input id={`start-${weekday}`} name="start_time" type="time" required defaultValue="10:00" className={timeInput} />
      <span aria-hidden className="text-ink-soft">
        a
      </span>
      <label className="sr-only" htmlFor={`end-${weekday}`}>
        Hasta
      </label>
      <input id={`end-${weekday}`} name="end_time" type="time" required defaultValue="18:00" className={timeInput} />
      <button type="submit" disabled={pending} className={quietButton}>
        <Plus aria-hidden className="size-4" />
        Agregar franja
      </button>
      {state.error && (
        <p role="alert" className="w-full text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
