"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Product } from "./data";

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

export function useProducts(category?: string) {
  const data = useQuery(api.merch.queries.listProducts, { category });
  return {
    data: data?.map(mapDocToProduct),
    isLoading: data === undefined,
    error: undefined as undefined | Error,
  };
}

export function useProductById(id: number) {
  const doc = useQuery(api.merch.queries.getProductByLegacyId, { legacyId: id });
  return {
    data: doc ? mapDocToProduct(doc) : undefined,
    isLoading: doc === undefined,
    error: undefined as undefined | Error,
  };
}

export function useCategories() {
  const data = useQuery(api.merch.queries.listCategories, {});
  return {
    data,
    isLoading: data === undefined,
    error: undefined as undefined | Error,
  };
}

export function useHydratedProducts(initialProducts: Product[], category?: string) {
  const { data: realtimeProducts } = useProducts(category);
  return {
    data: realtimeProducts || initialProducts,
    isLoading: false,
    error: undefined as undefined | Error,
  };
}

export function useHydratedCategories(initialCategories: string[]) {
  const { data: realtimeCategories } = useCategories();
  return {
    data: realtimeCategories || initialCategories,
    isLoading: false,
    error: undefined as undefined | Error,
  };
}
