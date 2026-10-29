"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-5 py-16 sm:px-8">
      <h1 className="font-display text-4xl font-bold tracking-[-0.03em]">Algo salió mal</h1>
      <p className="mt-4 max-w-[50ch] text-lg text-ink-soft">No pudimos cargar la página. Probá de nuevo en un momento.</p>
      <button
        onClick={reset}
        className="mt-8 w-fit rounded-full bg-lacquer px-6 py-3 font-display font-semibold text-on-lacquer"
      >
        Reintentar
      </button>
    </main>
  );
}
