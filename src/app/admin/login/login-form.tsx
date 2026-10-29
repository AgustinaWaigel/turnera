"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {} as LoginState);
  const input =
    "w-full rounded-xl border border-line-strong bg-paper px-4 py-3 outline-none transition-[border-color,box-shadow] focus:border-lacquer focus:shadow-[0_0_0_3px_var(--lacquer-wash)]";
  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          defaultValue={state.email}
          className={input}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          maxLength={200}
          className={input}
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger-wash px-4 py-3 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-lacquer px-6 py-3.5 font-display font-semibold text-on-lacquer transition-colors hover:bg-lacquer-strong disabled:opacity-50"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
