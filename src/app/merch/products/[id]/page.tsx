"use client";

import { Minus, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, ViewTransition } from "react";
import { motion, LayoutGroup } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFlyToCart } from "@/app/merch/lib/useFlyToCart";
import { useCart } from "@/app/merch/lib/cartContext";
import { useProductById } from "@/app/merch/lib/hooks";
import { useMerchNavigateWithTransition, useMerchTransition } from "@/app/merch/components/merch-transition-provider";

export default function ProductPage() {
  const params = useParams();
  const id = Number(params.id);
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const { data: product, isLoading, error } = useProductById(id);
  const {
    buttonRef,
    animatingElements,
    triggerAnimation,
    setAnimatingElements,
    FlyingPlusOne,
  } = useFlyToCart();
  const { pendingProduct, clearPendingProduct } = useMerchTransition();
  const navigateWithTransition = useMerchNavigateWithTransition();

  const displayProduct = product ?? (pendingProduct?.id === id ? pendingProduct : null);

  useEffect(() => {
    if (product) {
      clearPendingProduct();
    }
  }, [product, clearPendingProduct]);

  useEffect(() => {
    document.documentElement.scrollTo({ top: 0 });
  }, []);

  if (isLoading && !displayProduct) {
    return (
      <main className="min-h-screen bg-background py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="h-96 bg-muted rounded animate-pulse" />
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="h-8 bg-muted rounded animate-pulse" />
                  <div className="h-6 bg-muted rounded w-1/3 animate-pulse" />
                  <div className="h-12 bg-muted rounded w-1/4 animate-pulse" />
                  <div className="h-32 bg-muted rounded animate-pulse" />
                  <div className="h-12 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  if (error && !displayProduct) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-lg text-muted-foreground">
          {error ? "Failed to load product" : "Product not found"}
        </p>
        <Link href="/merch">
          <Button>Back to Shop</Button>
        </Link>
      </div>
    );
  }

  if (!displayProduct) {
    return null;
  }

  const handleAddToCart = () => {
    addItem(
      {
        id: displayProduct.id,
        title: displayProduct.title,
        price: displayProduct.price,
        image: displayProduct.image,
      },
      quantity
    );
    for (let i = 0; i < quantity; i++) {
      setTimeout(() => triggerAnimation(), i * 60);
    }
    setQuantity(1);
  };

  return (
    <main className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/merch"
          className="text-primary hover:text-primary-700 mb-6 inline-block"
          onClick={(event) => {
            if (
              event.defaultPrevented ||
              event.button !== 0 ||
              event.metaKey ||
              event.altKey ||
              event.ctrlKey ||
              event.shiftKey
            ) {
              return;
            }

            event.preventDefault();
            navigateWithTransition("/merch");
          }}
          prefetch
        >
          ← Back to Shop
        </Link>

        <LayoutGroup>
          <div className="grid md:grid-cols-2 gap-8">
            <ViewTransition name={`product-image-${displayProduct.id}`}>
              <motion.div layoutId={`product-image-${displayProduct.id}`}>
                <div className="flex items-center justify-center bg-muted rounded-lg p-8">
                  <div className="relative w-full h-96">
                    <Image
                      src={displayProduct.image}
                      alt={displayProduct.title}
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              </motion.div>
            </ViewTransition>

            <ViewTransition name={`product-details-${displayProduct.id}`}>
              <motion.div layoutId={`product-details-${displayProduct.id}`}>
              <Card>
                <CardContent className="pt-6">
                  <ViewTransition name={`product-title-${displayProduct.id}`}>
                    <motion.h1
                      layoutId={`product-title-${displayProduct.id}`}
                      className="text-3xl font-bold mb-4"
                    >
                      {displayProduct.title}
                    </motion.h1>
                  </ViewTransition>

                  {displayProduct.rating && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">⭐</span>
                      <span className="text-lg font-semibold">
                        {displayProduct.rating.rate}
                      </span>
                      <span className="text-muted-foreground">
                        ({displayProduct.rating.count} reviews)
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <span className="text-muted-foreground">Category</span>
                    <p className="text-lg font-medium capitalize">
                      {displayProduct.category}
                    </p>
                  </div>

                  <div className="mb-6">
                    <span className="text-muted-foreground">Price</span>
                    <p className="text-4xl font-bold text-accent">
                      ${displayProduct.price.toFixed(2)}
                    </p>
                  </div>

                  <div className="mb-6">
                    <span className="text-muted-foreground block mb-2">
                      Description
                    </span>
                    <p className="text-base leading-relaxed">
                      {displayProduct.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-muted-foreground">Quantity</span>
                    <div className="flex items-center border rounded-lg p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <span className="px-2 font-semibold">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={handleAddToCart}
                    className="w-full py-6 text-base"
                    ref={buttonRef}
                  >
                    Add to Cart
                  </Button>
                  {animatingElements.map(
                    ({ id, startX, startY, endX, endY }) => (
                      <FlyingPlusOne
                        key={id}
                        startX={startX}
                        startY={startY}
                        endX={endX}
                        endY={endY}
                        onEnd={() =>
                          setAnimatingElements((prev) =>
                            prev.filter((el) => el.id !== id)
                          )
                        }
                      />
                    )
                  )}
                </CardContent>
              </Card>
              </motion.div>
            </ViewTransition>
          </div>
        </LayoutGroup>
      </div>
    </main>
  );
}
