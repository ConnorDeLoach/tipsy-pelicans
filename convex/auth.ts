import Resend from "@auth/core/providers/resend";
import { convexAuth } from "@convex-dev/auth/server";
import { MutationCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Resend({
      from: "no-reply@tipsypelicans.com",
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx: MutationCtx, { userId, profile }) {
      const raw = typeof profile === "string" ? profile : (profile as any)?.email;
      const email = typeof raw === "string" ? raw.trim().toLowerCase() : undefined;
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
