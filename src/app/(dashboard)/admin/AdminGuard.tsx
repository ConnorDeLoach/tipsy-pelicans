"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const me = useQuery(api.me.get);
  const router = useRouter();

  useEffect(() => {
    if (me === undefined) return; // Still loading
    
    if (!me || me.role !== "admin") {
      router.push("/games");
    }
  }, [me, router]);

  // Show loading while checking auth
  if (me === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render children if not admin
  if (!me || me.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
