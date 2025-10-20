"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FormEvent, useState } from "react";

export default function SignInPage() {
  const { signIn } = useAuthActions();
  const convex = useConvex();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);

  const onSendMagicLink = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedEmail = loginEmail.trim();

    if (!trimmedEmail) {
      setLoginMessage(
        "Please enter an email address to receive a sign-in link."
      );
      return;
    }

    setIsSendingLink(true);
    setLoginMessage(null);

    try {
      const allowed = await convex.query(api.players.isEmailAllowed, {
        email: trimmedEmail,
      });
      if (!allowed) {
        setLoginMessage(
          "That email is not on the roster. Contact the head pelican to be added."
        );
        return;
      }

      await signIn("resend", { email: trimmedEmail });
      setLoginMessage(
        "Magic link sent! Check your inbox to finish signing in."
      );
      setLoginEmail("");
    } catch (error) {
      console.error("Failed to send magic link", error);
      setLoginMessage(
        "Something went wrong sending the magic link. Please try again."
      );
    } finally {
      setIsSendingLink(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-12">
        <section className="mx-auto w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-slate-300">
            Enter your email and we&apos;ll send you a magic link to access the
            roster.
          </p>
          <form onSubmit={onSendMagicLink} className="mt-6 grid gap-4">
            <label className="grid gap-1 text-sm">
              <span>Email</span>
              <input
                type="email"
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-500 focus:outline-none"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                required
              />
            </label>
            <button
              type="submit"
              className="rounded bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSendingLink}
            >
              {isSendingLink ? "Sending magic link…" : "Send magic link"}
            </button>
            {loginMessage && (
              <p className="text-sm text-slate-300">{loginMessage}</p>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}
