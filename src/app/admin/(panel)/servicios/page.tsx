import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { formatDuration, formatPrice } from "@/lib/format";
import type { Service } from "@/lib/types";
import { PageTitle } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { ServiceForm } from "@/components/admin/service-form";
import { deleteService } from "../../actions";

export const metadata: Metadata = { title: "Servicios" };

export default async function ServicesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price_cents, active, sort_order")
    .order("sort_order")
    .order("name");
  const services = (data ?? []) as Service[];

  return (
    <>
      <PageTitle title="Servicios" description="Lo que se puede reservar desde la página. La duración define cuánto lugar ocupa en la agenda." />

      <details className="group mb-10 rounded-2xl border border-line bg-paper open:pb-6">
        <summary className="cursor-pointer list-none px-5 py-4 font-display font-semibold text-lacquer marker:hidden">
          Agregar servicio
        </summary>
        <div className="px-5">
          <ServiceForm />
        </div>
      </details>

      {services.length === 0 ? (
        <p className="text-ink-soft">Todavía no cargaste servicios.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {services.map((s) => (
            <li key={s.id} className="py-4">
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className={`font-display text-lg font-semibold ${s.active ? "" : "text-ink-soft line-through"}`}>
                    {s.name}
                  </span>
                  {!s.active && <span className="text-sm text-ink-soft">Oculto</span>}
                  <span className="tabular ml-auto text-ink-soft">
                    {formatDuration(s.duration_minutes)} · {formatPrice(s.price_cents)}
                  </span>
                  <span className="text-sm font-semibold text-lacquer group-open:hidden">Editar</span>
                </summary>
                <div className="mt-5">
                  <ServiceForm service={s} />
                  <form action={deleteService} className="mt-4">
                    <input type="hidden" name="id" value={s.id} />
                    <DeleteButton label="Borrar servicio" confirm={`¿Borrar “${s.name}”? Los turnos ya tomados se mantienen.`} />
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
