import Script from "next/script";
import { headers } from "next/headers";
import { BookingFlow } from "@/components/booking/booking-flow";
import { business, whatsappLink } from "@/lib/config";
import { getActiveServices, getBookableDays } from "@/lib/booking/data";
import { serverEnv } from "@/lib/env";
import { turnstileEnabled } from "@/lib/security/turnstile";
import { AtSign, MapPin, MessageCircle } from "@/components/ui/icons";

export default async function Home() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const env = serverEnv();
  const [services, days] = await Promise.all([getActiveServices(), getBookableDays()]);
  const captcha = turnstileEnabled() ? env.NEXT_PUBLIC_TURNSTILE_SITE_KEY! : null;
  const wa = whatsappLink(`Hola! Te escribo desde la página de turnos de ${business.name}.`);

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <header className="relative bg-lacquer text-on-lacquer lg:sticky lg:top-0 lg:h-dvh">
        <div className="mx-auto flex h-full max-w-xl flex-col px-5 pt-10 pb-12 sm:px-8 lg:mx-0 lg:max-w-none lg:px-12 lg:pt-14 lg:pb-12 xl:px-16">
          <h1 className="font-display text-[clamp(2.75rem,9vw,5.5rem)] leading-[0.92] font-bold tracking-[-0.035em] [font-stretch:88%]">
            {business.name}
          </h1>
          <p className="mt-5 max-w-[34ch] text-lg leading-snug text-on-lacquer-soft">{business.tagline}</p>

          <div className="mt-auto hidden pt-12 lg:block">
            <p className="max-w-[40ch] text-sm leading-relaxed text-on-lacquer-soft">{business.copy.policy}</p>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm lg:mt-6">
            {business.address && (
              <li>
                <ContactLink href={business.mapsUrl || null} icon={<MapPin aria-hidden className="size-4" />}>
                  {business.address}
                </ContactLink>
              </li>
            )}
            {wa && (
              <li>
                <ContactLink href={wa} icon={<MessageCircle aria-hidden className="size-4" />}>
                  WhatsApp
                </ContactLink>
              </li>
            )}
            {business.instagram && (
              <li>
                <ContactLink
                  href={`https://instagram.com/${business.instagram}`}
                  icon={<AtSign aria-hidden className="size-4" />}
                >
                  {business.instagram}
                </ContactLink>
              </li>
            )}
          </ul>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-5 pt-10 pb-24 sm:px-8 lg:max-w-3xl lg:px-14 lg:pt-14 xl:px-20">
        <BookingFlow services={services} days={days} captchaSiteKey={captcha} />
        <p className="mt-14 max-w-[60ch] text-sm leading-relaxed text-ink-soft lg:hidden">{business.copy.policy}</p>
      </main>

      {captcha && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" nonce={nonce} />
      )}
    </div>
  );
}

function ContactLink({ href, icon, children }: { href: string | null; icon: React.ReactNode; children: React.ReactNode }) {
  const inner = (
    <span className="inline-flex items-center gap-2">
      {icon}
      <span>{children}</span>
    </span>
  );
  if (!href) return <span className="text-on-lacquer-soft">{inner}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-on-lacquer underline decoration-on-lacquer/40 hover:decoration-on-lacquer focus-visible:outline-on-lacquer"
    >
      {inner}
    </a>
  );
}
