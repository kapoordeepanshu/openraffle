"use client";

import { Suspense, startTransition, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "../actions";
import { Lock } from "@/components/icons";

function LoginForm() {
  const [state, run, pending] = useActionState(login, null);
  const next = useSearchParams().get("next") ?? "/admin";
  return (
    <form
      // onSubmit (not action=) so React doesn't clear the email after a failed attempt
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => run(fd));
      }}
      className="card w-full max-w-sm p-8 space-y-5"
    >
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent"><Lock /></div>
      <div>
        <h1 className="display text-2xl">Admin sign in</h1>
        <p className="text-sm text-muted mt-1">Manage raffles, entries and draws.</p>
      </div>
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="username" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      {state?.error && <p className="text-sm text-accent" role="alert">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-dvh grid place-items-center px-5">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
