"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFlyToCart } from "@/app/merch/lib/useFlyToCart";
import { useCart } from "@/app/merch/lib/cartContext";
import { motion } from "motion/react";
import type { Product } from "@/app/merch/lib/data";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const {
    buttonRef,
    animatingElements,
    triggerAnimation,
    setAnimatingElements,
    FlyingPlusOne,
  } = useFlyToCart();

  const handleAddToCart = () => {
    addItem(
      {
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
      },
      1
    );
    triggerAnimation();
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/merch/products/${product.id}`} className="shrink-0">
        <motion.div layoutId={`product-image-${product.id}`}>
          <div className="relative h-56 w-full bg-muted overflow-hidden">
            <Image
              src={product.image}
              alt={product.title}
              fill
              className="object-contain p-4 hover:scale-105 transition-transform"
            />
          </div>
        </motion.div>
      </Link>
      <motion.div layoutId={`product-details-${product.id}`}>
        <CardContent className="flex-1 flex flex-col p-4">
          <Link
            href={`/merch/products/${product.id}`}
            className="hover:text-accent transition-colors"
          >
            <motion.h3
              layoutId={`product-title-${product.id}`}
              className="font-semibold line-clamp-2 mb-2"
            >
              {product.title}
            </motion.h3>
          </Link>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
            {product.description}
          </p>

          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-lg font-bold">${product.price.toFixed(2)}</p>
              {product.rating && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-muted-foreground">
                    ⭐ {product.rating.rate}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({product.rating.count})
                  </span>
                </div>
              )}
            </div>
            <Button
              size="sm"
              className="z-5"
              onClick={handleAddToCart}
              ref={buttonRef}
            >
              Add
            </Button>
            {animatingElements.map(({ id, startX, startY, endX, endY }) => (
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
            ))}
          </div>
        </CardContent>
      </motion.div>
    </Card>
  );
}
