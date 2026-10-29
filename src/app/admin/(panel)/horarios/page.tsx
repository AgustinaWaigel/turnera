import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import type { WorkingHour } from "@/lib/types";
import { PageTitle } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { HourForm } from "@/components/admin/hour-form";
import { deleteWorkingHour } from "../../actions";

export const metadata: Metadata = { title: "Horarios" };

// Lunes primero, que es como se piensa una semana de trabajo.
const week = [1, 2, 3, 4, 5, 6, 0];
const names = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default async function HoursPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("working_hours").select("id, weekday, start_time, end_time").order("start_time");
  const hours = (data ?? []) as WorkingHour[];

  return (
    <>
      <PageTitle
        title="Horarios"
        description="Franjas en las que se puede reservar. Podés cargar más de una por día, por ejemplo mañana y tarde."
      />
      <ul className="divide-y divide-line border-y border-line">
        {week.map((wd) => {
          const ranges = hours.filter((h) => h.weekday === wd);
          return (
            <li key={wd} className="grid gap-3 py-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start">
              <p className="font-display text-lg font-semibold">{names[wd]}</p>
              <div className="flex flex-col gap-3">
                {ranges.length === 0 ? (
                  <p className="text-ink-soft">Cerrado</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {ranges.map((r) => (
                      <li key={r.id} className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-paper py-1 pr-1 pl-3.5">
                        <span className="tabular font-medium">
                          {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                        </span>
                        <form action={deleteWorkingHour}>
                          <input type="hidden" name="id" value={r.id} />
                          <DeleteButton label="" />
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <HourForm weekday={wd} />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
