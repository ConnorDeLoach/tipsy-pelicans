import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating?: { rate: number; count: number };
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function mapDocToProduct(doc: any): Product {
  return {
    id: doc.legacyId,
    title: doc.title,
    price: doc.price,
    description: doc.description,
    category: doc.category,
    image: doc.image,
    rating: doc.rating,
  };
}

export async function getProducts(category?: string): Promise<Product[]> {
  const data = await convex.query(api.merch.queries.listProducts, { category });
  return data?.map(mapDocToProduct) || [];
}

export async function getCategories(): Promise<string[]> {
  return await convex.query(api.merch.queries.listCategories, {});
}
