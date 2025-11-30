import Resend from "@auth/core/providers/resend";
import { convexAuth } from "@convex-dev/auth/server";
import { MutationCtx } from "./_generated/server";

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

const extractProfileEmail = (profile: unknown): string | undefined => {
  if (typeof profile === "string") {
    return profile;
  }
  return (
    getStringProperty(profile, "email") ??
    getStringProperty(profile, "emailAddress")
  );
};

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Resend({
      from: "no-reply@tipsypelicans.com",
    }),
  ],
  session: {
    totalDurationMs: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
    inactiveDurationMs: 365 * 24 * 60 * 60 * 1000, // 1 year
  },
  callbacks: {
    async afterUserCreatedOrUpdated(ctx: MutationCtx, { userId, profile }) {
      const raw = extractProfileEmail(profile);
      const email = raw ? raw.trim().toLowerCase() : undefined;
      if (!email) {
        throw new Error("Email required");
      }

      const player = await ctx.db
        .query("players")
        .withIndex("by_email", (q) => q.eq("emailLowercase", email))
        .unique();

      if (!player) {
        throw new Error("Email not on roster");
      }

      if (!player.userId) {
        await ctx.db.patch(player._id, { userId });
      }
    },
  },
});
