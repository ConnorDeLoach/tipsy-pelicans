"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const me = useQuery(api.me.get);
  const router = useRouter();

  useEffect(() => {
    if (me?.role) {
      const target = me.role === "admin" ? "/admin/roster" : "/games";
      router.prefetch(target);
      router.replace(target);
    }
  }, [me, router]);

  if (me === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <main className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-12">
          <p className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
            Checking your sign-in status…
          </p>
        </main>
      </div>
    );
  }

  return null;
}
