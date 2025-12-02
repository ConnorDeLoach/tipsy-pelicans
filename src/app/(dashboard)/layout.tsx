import { DashboardShell } from "@/components/dashboard-shell";

/**
 * Dashboard layout - Server Component wrapper.
 * The actual shell is a client component to handle pathname-dependent styling.
 * This separation allows the layout to be rendered on the server initially.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
