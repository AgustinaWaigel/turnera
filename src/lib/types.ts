export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

export type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number | null;
  active: boolean;
  sort_order: number;
};

export type WorkingHour = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export type TimeOff = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export type Appointment = {
  id: string;
  service_id: string | null;
  service_name: string;
  price_cents: number | null;
  starts_at: string;
  ends_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  notes: string | null;
  status: AppointmentStatus;
  created_at: string;
};

export type Slot = { iso: string; label: string };
export type Day = { date: string; weekday: string; day: string; month: string };
