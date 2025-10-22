"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function RsvpPage() {
  const params = useSearchParams();
  const choice = params.get("status"); // "in" | "out" | null

  const statusLine =
    choice === "in"
      ? "Your RSVP has been recorded: IN."
      : choice === "out"
      ? "Your RSVP has been recorded: OUT."
      : "Your RSVP has been recorded.";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border p-6">
        <h1 className="text-2xl font-semibold">RSVP Confirmed</h1>
        <p>{statusLine}</p>
        <p className="text-sm opacity-80">
          Need to change it? Head to the Games page.
        </p>
        <div>
          <Link
            href="/games"
            className="inline-block rounded-md border px-4 py-2 hover:bg-muted"
          >
            Go to Games
          </Link>
        </div>
      </div>
    </div>
  );
}
