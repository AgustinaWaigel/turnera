"use client";

import { saveService } from "@/app/admin/actions";
import { useFormAction } from "./use-form-action";
import type { Service } from "@/lib/types";
import { inputClass, primaryButton } from "./ui";

export function ServiceForm({ service }: { service?: Service }) {
  const { state, pending, formProps } = useFormAction(saveService, { resetOnSuccess: !service });
  const price = service?.price_cents == null ? "" : String(service.price_cents / 100);

  return (
    <form {...formProps} className="grid gap-4 sm:grid-cols-6">
      <input type="hidden" name="id" value={service?.id ?? ""} />
      <label className="sm:col-span-4">
        <span className="mb-1.5 block text-sm font-semibold">Nombre</span>
        <input name="name" required minLength={2} maxLength={80} defaultValue={service?.name} className={inputClass} />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1.5 block text-sm font-semibold">Orden</span>
        <input name="sort_order" type="number" min={0} max={999} defaultValue={service?.sort_order ?? 0} className={inputClass} />
      </label>
      <label className="sm:col-span-6">
        <span className="mb-1.5 block text-sm font-semibold">
          Descripción <span className="font-normal text-ink-soft">(opcional)</span>
        </span>
        <input name="description" maxLength={300} defaultValue={service?.description ?? ""} className={inputClass} />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1.5 block text-sm font-semibold">Duración (min)</span>
        <input
          name="duration_minutes"
          type="number"
          required
          min={5}
          max={480}
          step={5}
          defaultValue={service?.duration_minutes ?? 60}
          className={`${inputClass} tabular`}
        />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1.5 block text-sm font-semibold">Precio</span>
        <input
          name="price"
          inputMode="decimal"
          placeholder="Vacío = consultar"
          defaultValue={price}
          className={`${inputClass} tabular`}
        />
      </label>
      <label className="flex items-center gap-2.5 self-end pb-3 sm:col-span-2">
        <input name="active" type="checkbox" defaultChecked={service?.active ?? true} className="size-4" />
        <span className="text-sm font-semibold">Visible en la página</span>
      </label>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-6">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Guardando…" : service ? "Guardar cambios" : "Agregar"}
        </button>
        {state.error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {state.error}
          </p>
        )}
        {state.ok && !pending && (
          <p role="status" className="text-sm font-medium text-ok">
            Guardado.
          </p>
        )}
      </div>
    </form>
  );
}
