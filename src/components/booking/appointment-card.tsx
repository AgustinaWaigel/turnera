"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { business, whatsappLink } from "@/lib/config";
import { formatDuration, formatPrice } from "@/lib/format";
import { Check, Copy, MessageCircle } from "@/components/ui/icons";

type Props = {
  token: string;
  confirmed: boolean;
  serviceName: string;
  priceCents: number | null;
  durationMinutes: number;
  dateLabel: string;
  timeLabel: string;
  customerName: string;
};

export function AppointmentCard(props: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => business.siteUrl
  );
  const manageUrl = `${origin}/turno/${props.token}`;

  useEffect(() => {
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [props.token]);

  const wa = whatsappLink(
    `Hola! Soy ${props.customerName}. Pedí un ${business.copy.appointment} de ${props.serviceName} para el ${props.dateLabel} a las ${props.timeLabel} h.`
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(manageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2
          ref={heading}
          tabIndex={-1}
          className="font-display text-[2.25rem] leading-[1.02] font-bold tracking-[-0.03em] outline-none sm:text-5xl"
        >
          {props.confirmed ? "¡Listo, te esperamos!" : "¡Pedido! Ya casi está."}
        </h2>
        <p className="mt-3 max-w-[52ch] text-lg text-ink-soft">
          {props.confirmed
            ? `Tu ${business.copy.appointment} quedó reservado.`
            : `${capitalize(business.owner || business.copy.professional)} lo revisa y te lo confirma por WhatsApp.`}
        </p>
      </div>

      <article className="reveal overflow-hidden rounded-[18px] border border-line bg-paper shadow-[0_24px_40px_-28px_oklch(0.3_0.05_var(--h)/0.45)]">
        <div className="bg-lacquer px-6 pt-6 pb-5 text-on-lacquer sm:px-8">
          <p className="font-display text-sm font-semibold">{business.name}</p>
          <p className="mt-4 font-display text-[2rem] leading-none font-bold tracking-[-0.02em] first-letter:uppercase sm:text-4xl">
            {props.dateLabel}
          </p>
          <p className="tabular mt-2 font-display text-5xl leading-none font-bold tracking-[-0.03em] sm:text-6xl">
            {props.timeLabel}
            <span className="ml-1 text-2xl text-on-lacquer-soft">h</span>
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 py-6 sm:px-8">
          <div className="col-span-2">
            <dt className="text-sm text-ink-soft">Servicio</dt>
            <dd className="font-display text-xl font-semibold">{props.serviceName}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">Duración</dt>
            <dd className="tabular font-medium">{formatDuration(props.durationMinutes)}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">Precio</dt>
            <dd className="tabular font-medium">{formatPrice(props.priceCents)}</dd>
          </div>
          {business.address && (
            <div className="col-span-2">
              <dt className="text-sm text-ink-soft">Dónde</dt>
              <dd className="font-medium">{business.address}</dd>
            </div>
          )}
        </dl>
        <div className="perforation mx-4" aria-hidden />
        <div className="px-6 py-5 sm:px-8">
          <p className="text-sm text-ink-soft">
            Guardá este link para ver o cancelar tu {business.copy.appointment}. Es personal: no lo compartas.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-ground px-3 py-2 text-sm">{manageUrl}</code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-sm font-semibold transition-colors hover:border-ink"
            >
              {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
              <span aria-live="polite">{copied ? "Copiado" : "Copiar"}</span>
            </button>
          </div>
        </div>
      </article>

      <div className="flex flex-col gap-3 sm:flex-row">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 rounded-full bg-lacquer px-6 py-3.5 font-display font-semibold text-on-lacquer transition-colors hover:bg-lacquer-strong"
          >
            <MessageCircle aria-hidden className="size-5" />
            Avisar por WhatsApp
          </a>
        )}
        <a
          href={manageUrl}
          className="inline-flex items-center justify-center rounded-full border border-line-strong px-6 py-3.5 font-display font-semibold transition-colors hover:border-ink"
        >
          Ver mi {business.copy.appointment}
        </a>
      </div>
    </div>
  );
}

function noopSubscribe() {
  return () => {};
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
