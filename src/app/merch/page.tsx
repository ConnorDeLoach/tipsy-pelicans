import { MerchClient } from "@/app/merch/components/merch-client";
import { getProducts, getCategories, Product } from "@/app/merch/lib/data";
import { Suspense } from "react";

interface MerchPageProps {
  searchParams: Promise<{ category?: string; sortBy?: string }>;
}

export default async function MerchHome({ searchParams }: MerchPageProps) {
  const params = await searchParams;
  const category = params.category || undefined;
  const sortBy = params.sortBy || "default";

  const [products, categories] = await Promise.all([
    getProducts(category),
    getCategories(),
  ]);

  return (
    <Suspense fallback={<MerchSkeleton />}>
      <MerchClient
        initialProducts={products}
        initialCategories={categories}
        category={category}
        sortBy={sortBy}
      />
    </Suspense>
  );
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
