import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import type { TimeOff } from "@/lib/types";
import { PageTitle } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { TimeOffForm } from "@/components/admin/time-off-form";
import { deleteTimeOff } from "../../actions";

export const metadata: Metadata = { title: "Bloqueos" };

export default async function TimeOffPage() {
  const { supabase } = await requireAdmin();
  const tz = serverEnv().BUSINESS_TIMEZONE;
  const { data } = await supabase
    .from("time_off")
    .select("id, starts_at, ends_at, reason")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at");
  const blocks = (data ?? []) as TimeOff[];

  return (
    <>
      <PageTitle
        title="Bloqueos"
        description="Vacaciones, feriados o un rato libre. Mientras dure el bloqueo no se puede reservar. Los turnos que ya estaban tomados no se cancelan solos."
      />
      <div className="mb-12 rounded-2xl border border-line bg-paper p-5 sm:p-6">
        <TimeOffForm />
      </div>
      {blocks.length === 0 ? (
        <p className="text-ink-soft">No hay bloqueos próximos.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {blocks.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-4">
              <div className="min-w-0 flex-1">
                <p className="tabular font-semibold first-letter:uppercase">
                  {formatDateTime(b.starts_at, tz)} <span className="text-ink-soft">→</span> {formatDateTime(b.ends_at, tz)}
                </p>
                {b.reason && <p className="text-ink-soft">{b.reason}</p>}
              </div>
              <form action={deleteTimeOff}>
                <input type="hidden" name="id" value={b.id} />
                <DeleteButton label="Quitar" />
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
