// app/debug-auth/page.tsx
"use client";

import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useConvexAuth,
} from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function DebugAuthPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.me.get); // safe to call inside these wrappers

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Auth Debug</h1>

      <AuthLoading>
        <p>Checking session…</p>
      </AuthLoading>

      <Authenticated>
        <div className="rounded-lg border p-4">
          <p className="font-medium">Signed in ✅</p>
          <p>
            Client says: isAuthenticated = {String(isAuthenticated)}, isLoading
            = {String(isLoading)}
          </p>
          <p>
            User:{" "}
            {me
              ? `${me.firstName ?? ""} ${me.lastName ?? ""} (${
                  me.role ?? "player"
                })`
              : "loading…"}
          </p>
          {/* Put "signed-in only" UI here */}
        </div>
      </Authenticated>

      <Unauthenticated>
        <div className="rounded-lg border p-4">
          <p className="font-medium">Signed out ❌</p>
          <p>
            Client says: isAuthenticated = {String(isAuthenticated)}, isLoading
            = {String(isLoading)}
          </p>
          {/* Link to your /signin page or button that kicks off sign-in */}
          <a className="underline" href="/signin">
            Go to Sign In
          </a>
        </div>
      </Unauthenticated>
    </div>
  );
}
