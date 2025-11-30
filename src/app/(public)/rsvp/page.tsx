"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ScheduleBanner } from "@/components/schedule-banner";

export default function RsvpPage() {
  const router = useRouter();
  const params = useSearchParams();
  const choice = params.get("status"); // "in" | "out" | null

  const statusLine =
    choice === "in"
      ? "Tipsy is ... pleased"
      : choice === "out"
      ? "Tipsy is ... displeased"
      : "Tipsy is ... undecided";

  const isIn = choice === "in";
  const isOut = choice === "out";
  const mascotClass = isIn
    ? "animate-tipsy-bounce"
    : isOut
    ? "animate-tipsy-wobble"
    : "";
  const backdropClass = isIn ? "bg-tint-blue" : isOut ? "bg-tint-orange" : "";
  const statusWord = isIn ? "pleased" : isOut ? "displeased" : "undecided";
  const mascotSrc = isIn
    ? "/tipsy-inscryption-trans-pleased.png"
    : isOut
    ? "/tipsy-inscryption-trans.png"
    : "/tipsy-inscryption-trans-pleased.png";
  const statusWordClass = isIn
    ? "text-gradient-blue"
    : isOut
    ? "text-gradient-orange"
    : "text-brand-gradient";
  const cardRingClass = isIn
    ? "ring-1 ring-blue-300/40"
    : isOut
    ? "ring-1 ring-orange-300/40"
    : "ring-1 ring-border/40";

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center p-6 ${backdropClass}`}
    >
      <Image
        src={mascotSrc}
        alt="Tipsy Pelicans mascot"
        width={640}
        height={640}
        className={`mb-6 h-auto w-96 sm:w-[32rem] ${mascotClass}`}
        priority
      />
      <div
        className={`w-full max-w-md space-y-6 rounded-xl border border-border bg-card/90 p-6 shadow-2xl backdrop-blur-sm ${cardRingClass}`}
      >
        <h1 className="text-2xl font-semibold text-brand-gradient">
          RSVP Confirmed
        </h1>
        <p className="text-lg sm:text-xl">
          Tipsy is ...{" "}
          <span
            className={`${statusWordClass} text-3xl sm:text-4xl font-extrabold align-baseline`}
          >
            {statusWord}
          </span>
        </p>
        <p className="text-sm opacity-80">
          Need to change it? Head to the Games page.
        </p>
        <div>
          <Link
            href="/games"
            onMouseEnter={() => router.prefetch("/games")}
            className="inline-block rounded-md border px-4 py-2 hover:bg-muted"
          >
            Go to Games
          </Link>
        </div>
      </div>
    </div>
  );
}
