"use client";

import { useActionState, useState } from "react";
import { cancelAppointment, type CancelState } from "@/app/actions/booking";
import { business } from "@/lib/config";

export function CancelForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(cancelAppointment, { status: "idle" } as CancelState);
  const [confirming, setConfirming] = useState(false);

  if (state.status === "cancelled") {
    return (
      <p role="status" className="text-lg font-medium">
        Listo, cancelamos tu {business.copy.appointment}. ¡Gracias por avisar!
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <p className="max-w-[55ch] text-ink-soft">{business.copy.policy}</p>
      {state.status === "error" && (
        <p role="alert" className="rounded-xl bg-danger-wash px-4 py-3 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-danger px-6 py-3 font-display font-semibold text-on-lacquer transition-opacity disabled:opacity-50"
          >
            {pending ? "Cancelando…" : `Sí, cancelar el ${business.copy.appointment}`}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-full px-5 py-3 font-semibold text-ink-soft hover:text-ink"
          >
            No, lo mantengo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-fit rounded-full border border-line-strong px-6 py-3 font-display font-semibold transition-colors hover:border-danger hover:text-danger"
        >
          Cancelar {business.copy.appointment}
        </button>
      )}
    </form>
  );
}
