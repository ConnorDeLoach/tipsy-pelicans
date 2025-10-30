"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCard } from "@/app/merch/components/product-card";
import { useCategories, useProducts } from "@/app/merch/lib/hooks";

export default function MerchHome() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const category = searchParams.get("category") || undefined;
  const sortBy = searchParams.get("sortBy") || "default";

  const { data: products = [], isLoading, error } = useProducts(category);
  const { data: categories = [] } = useCategories();

  const sorted = sortProducts(products, sortBy);

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "default") params.set(key, value);
    else params.delete(key);
    router.push(`/merch?${params.toString()}`);
  };

  const handleCategoryChange = (selected: string) => {
    const params = new URLSearchParams(searchParams);
    if (selected !== "all") params.set("category", selected);
    else params.delete("category");
    router.push(`/merch?${params.toString()}`);
  };

  if (isLoading) return <MerchSkeleton />;
  if (error) return <ErrorState />;

  return (
    <main className="min-h-screen bg-background text-foreground py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Our Merch</h1>
          <p className="text-muted-foreground mt-2">
            {sorted.length} products found
          </p>
        </div>

        <div className="mb-5 flex flex-wrap gap-3 items-center justify-start">
          <Select
            value={category || "all"}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="h-6 w-px bg-border ml-3 mr-2" />

          <div className="flex gap-2 items-center justify-center">
            <label className="text-sm text-muted-foreground">Sort By</label>
            <Select
              value={sortBy}
              onValueChange={(v) => updateParams("sortBy", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="rating">Rating: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-lg text-muted-foreground">No products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {sorted.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}

function sortProducts(products: any[], sortBy: string) {
  switch (sortBy) {
    case "price-asc":
      return [...products].sort((a, b) => a.price - b.price);
    case "price-desc":
      return [...products].sort((a, b) => b.price - a.price);
    case "rating":
      return [...products].sort(
        (a, b) => (b.rating?.rate || 0) - (a.rating?.rate || 0)
      );
    default:
      return products;
  }
}

function MerchSkeleton() {
  return (
    <main className="min-h-screen bg-background text-foreground py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Our Merch</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  );
}

function ErrorState() {
  return (
    <main className="min-h-screen bg-background text-foreground py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-lg text-destructive-foreground">
            Failed to load products
          </p>
        </div>
      </div>
    </main>
  );
}
