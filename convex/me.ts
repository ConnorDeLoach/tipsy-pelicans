import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "./_generated/dataModel";

const getStringProperty = (value: unknown, key: string): string | undefined => {
  if (
    typeof value === "object" &&
    value !== null &&
    key in value &&
    typeof (value as Record<string, unknown>)[key] === "string"
  ) {
    return (value as Record<string, string>)[key];
  }
  return undefined;
};

// Returns basic information about the currently signed-in user
// plus any matching player profile in our app DB.
//
// Shape is tailored to what src/app/debug-auth/page.tsx renders:
// - firstName, lastName, role ("admin" | "player")
// - also include ids and email for debugging convenience
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    // Convex Auth's email provider stores the email on the user document.
    // Be defensive in case of schema differences.
    const email: string | undefined =
      getStringProperty(user, "email") ??
      getStringProperty(user, "emailAddress") ??
      undefined;

    // Prefer linking via userId if available; fallback to email mapping for legacy rows.
    let player: Doc<"players"> | null = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!player && email) {
      player = await ctx.db
        .query("players")
        .withIndex("by_email", (q) => q.eq("emailLowercase", email.toLowerCase()))
        .unique();
    }

    // Derive name fields from player.name first, falling back to user.name.
    const displayName: string | undefined =
      player?.name ?? getStringProperty(user, "name");
    const [firstName, ...rest] = (displayName ?? "").split(" ").filter(Boolean);
    const lastName = rest.length ? rest.join(" ") : undefined;

    const role: "admin" | "player" = player?.isAdmin ? "admin" : "player";

    return {
      userId,
      playerId: player?._id,
      email,
      name: displayName,
      firstName: firstName || undefined,
      lastName,
      role,
    } as const;
  },
});
