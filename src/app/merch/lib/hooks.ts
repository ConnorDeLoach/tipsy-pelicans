"use client";

import { useQuery } from "convex/react";
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
