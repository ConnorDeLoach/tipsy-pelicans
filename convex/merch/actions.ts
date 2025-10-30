import { internalAction } from "../_generated/server";
import { api, internal } from "../_generated/api";

export const seed = internalAction({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.runQuery(api.merch.queries.listProducts, {});
    if (existing.length > 0) return { inserted: 0 };

    const now = Date.now();
    const sample = [
      {
        legacyId: 1,
        title: "Classic Tipsy Tee",
        price: 24.99,
        description: "Soft cotton tee with the Tipsy logo.",
        category: "clothing",
        image: "/tipsy-bird.png",
        rating: { rate: 4.6, count: 120 },
      },
      {
        legacyId: 2,
        title: "Tipsy Trucker Hat",
        price: 19.99,
        description: "Adjustable mesh-back cap.",
        category: "accessories",
        image: "/Tipsy-TP.png",
        rating: { rate: 4.3, count: 75 },
      },
      {
        legacyId: 3,
        title: "Warmup Hoodie",
        price: 49.0,
        description: "Midweight fleece hoodie for rink-side chills.",
        category: "clothing",
        image: "/tipsy-inscryption.png",
        rating: { rate: 4.8, count: 210 },
      },
      {
        legacyId: 4,
        title: "Stainless Water Bottle",
        price: 29.0,
        description: "Insulated bottle keeps drinks cold.",
        category: "accessories",
        image: "/fl-blue.png",
        rating: { rate: 4.2, count: 44 },
      },
      {
        legacyId: 5,
        title: "Arena Tote Bag",
        price: 18.5,
        description: "Carry-all tote for gear and snacks.",
        category: "accessories",
        image: "/fl-orange.png",
        rating: { rate: 4.1, count: 33 },
      },
      {
        legacyId: 6,
        title: "Performance Long Sleeve",
        price: 32.0,
        description: "Moisture-wicking long sleeve shirt.",
        category: "clothing",
        image: "/tipsy-inscryption-trans.png",
        rating: { rate: 4.5, count: 91 },
      },
    ];

    let inserted = 0;
    for (const p of sample) {
      await ctx.runMutation(internal.merch.mutations.insertProduct, p as any);
      inserted += 1;
    }
    return { inserted, at: now };
  },
});
