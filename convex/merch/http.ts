import { httpAction } from "../_generated/server";
import { api } from "../_generated/api";

export function registerHttpRoutes(http: any) {
  http.route({
    path: "/api/merch/products",
    method: "GET",
    handler: httpAction(async (ctx, req) => {
      const url = new URL(req.url);
      const category = url.searchParams.get("category") || undefined;
      const products = await ctx.runQuery(api.merch.queries.listProducts, {
        category,
      });
      const shaped = products.map((p: any) => ({ id: p.legacyId, ...p }));
      return new Response(JSON.stringify(shaped), {
        headers: { "content-type": "application/json" },
      });
    }),
  });

  http.route({
    path: "/api/merch/products/:id",
    method: "GET",
    handler: httpAction(async (ctx, req) => {
      const match = req.url.match(/\/api\/merch\/products\/(\d+)/);
      const legacyId = match ? Number(match[1]) : NaN;
      if (!legacyId || Number.isNaN(legacyId)) {
        return new Response("Invalid id", { status: 400 });
      }
      const product = await ctx.runQuery(
        api.merch.queries.getProductByLegacyId,
        {
          legacyId,
        }
      );
      if (!product) return new Response("Not found", { status: 404 });
      const shaped = { id: product.legacyId, ...product };
      return new Response(JSON.stringify(shaped), {
        headers: { "content-type": "application/json" },
      });
    }),
  });

  http.route({
    path: "/api/merch/categories",
    method: "GET",
    handler: httpAction(async (ctx) => {
      const categories = await ctx.runQuery(
        api.merch.queries.listCategories,
        {}
      );
      return new Response(JSON.stringify(categories), {
        headers: { "content-type": "application/json" },
      });
    }),
  });

  http.route({
    path: "/api/merch/products/category/:category",
    method: "GET",
    handler: httpAction(async (ctx, req) => {
      const url = new URL(req.url);
      const [, , , , , , categoryRaw] = url.pathname.split("/");
      const category = decodeURIComponent(categoryRaw || "");
      if (!category) return new Response("Missing category", { status: 400 });
      const products = await ctx.runQuery(
        api.merch.queries.listProductsByCategory,
        { category }
      );
      const shaped = products.map((p: any) => ({ id: p.legacyId, ...p }));
      return new Response(JSON.stringify(shaped), {
        headers: { "content-type": "application/json" },
      });
    }),
  });
}
