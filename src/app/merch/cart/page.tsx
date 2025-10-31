"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/app/merch/lib/cartContext";

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    clearCart();
    window.location.href = "/merch/checkout-success";
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-background py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-6">
              Your cart is empty
            </p>
            <Link href="/merch">
              <Button>Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8 text-foreground">
          Shopping Cart
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{
                    layout: { duration: 0.2, ease: "easeInOut" },
                    default: { duration: 0.1 },
                  }}
                >
                  <CartProductCard
                    item={item}
                    updateQuantity={updateQuantity}
                    removeItem={removeItem}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span>FREE</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span>$0.00</span>
                  </div>
                </div>

                <div className="border-t pt-4 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>

                <Button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full py-6 text-base"
                >
                  {isCheckingOut ? "Processing..." : "Proceed to Checkout"}
                </Button>

                <Button variant="outline" className="w-full" asChild>
                  <Link href="/merch">Continue Shopping</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

function CartProductCard({
  item,
  updateQuantity,
  removeItem,
}: {
  item: {
    id: number;
    title: string;
    price: number;
    image: string;
    quantity: number;
  };
  updateQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex gap-4">
          <div className="relative w-24 h-24 shrink-0 bg-muted rounded-lg overflow-hidden">
            <Image
              src={item.image}
              alt={item.title}
              fill
              className="object-contain p-2"
            />
          </div>

          <div className="flex-1">
            <Link
              href={`/merch/products/${item.id}`}
              className="hover:underline transition-colors"
            >
              <h3 className="font-semibold line-clamp-2 mb-2">{item.title}</h3>
            </Link>
            <p className="text-lg font-bold mb-3">${item.price.toFixed(2)}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center border rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="px-3 py-1 font-semibold">{item.quantity}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="text-right flex flex-col justify-between items-end">
            <p className="text-lg font-bold">
              ${(item.price * item.quantity).toFixed(2)}
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="w-8"
              onClick={() => removeItem(item.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
