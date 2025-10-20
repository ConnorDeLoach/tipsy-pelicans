import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const me = await fetchQuery(api.me.get, {});

  if (!me || me.role !== "admin") {
    redirect("/games");
  }

  return children;
}
