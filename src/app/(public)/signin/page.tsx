"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const { signIn } = useAuthActions();
  const convex = useConvex();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);

  const onSubmitLogin = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedEmail = loginEmail.trim();

    if (!trimmedEmail) {
      setLoginMessage("Please enter an email address to receive a login link.");
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
        "Login link sent! Check your inbox to finish signing in."
      );
      setLoginEmail("");
    } catch (error) {
      console.error("Failed to send login link", error);
      setLoginMessage(
        "Something went wrong while sending the login link. Please try again."
      );
    } finally {
      setIsSendingLink(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col text-foreground"
      style={{
        backgroundImage: "url('/fl-orange.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <section
          className="w-full max-w-md rounded-xl border border-border p-8 shadow text-white"
          style={{ backgroundColor: "#316DB3" }}
        >
          <h1 className="text-2xl font-semibold">Tipsy Sign in</h1>
          <p className="mt-2 text-sm text-white/80">For pelicans only</p>
          <form onSubmit={onSubmitLogin} className="mt-8 grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isSendingLink}>
              {isSendingLink ? "Logging in…" : "Login"}
            </Button>
            {loginMessage && (
              <p className="text-sm text-white/80">{loginMessage}</p>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}
