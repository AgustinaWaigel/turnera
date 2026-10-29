"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import type { ActionResult } from "@/app/admin/actions";

/**
 * Como useActionState, pero sin el reseteo automático del <form> de React 19:
 * si el servidor devuelve un error, lo que escribiste queda donde estaba. Solo
 * se limpia cuando sale bien y lo pedís con `resetOnSuccess`.
 */
export function useFormAction(
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>,
  { resetOnSuccess = false } = {}
) {
  const [state, dispatch, pending] = useActionState(action, {} as ActionResult);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return { state, pending, formProps: { ref: formRef, onSubmit } };
}
