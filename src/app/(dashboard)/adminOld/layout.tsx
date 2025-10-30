import { ReactNode } from "react";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  //   const me = await fetchQuery(api.me.get, {});

  //   if (!me || me.role !== "admin") {
  //     redirect("/games");
  //   }

  return children;
}
