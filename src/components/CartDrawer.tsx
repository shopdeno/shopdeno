"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";

export function CartDrawer() {
  const [mounted, setMounted] = useState(false);
  const { cart, isOpen, closeCart, updateItem, removeItem, isLoading } = useCart();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) return null;

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={closeCart} />

      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md transform transition-transform duration-300 ease-in-out">
          <div className="flex h-full flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-6 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">
                Shopping Cart ({cart?.lines.reduce((sum, line) => sum + line.quantity, 0) || 0})
              </h2>
              <button
                onClick={closeCart}
                className="relative p-2 text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {cart?.lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
                <ShoppingBag className="h-16 w-16 text-gray-300" />
                <p className="mt-4 text-gray-500">Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-4 sm:px-6">
                  <ul className="divide-y divide-gray-200">
                    {cart?.lines.map((line) => (
                      <li key={line.id} className="py-4">
                        <div className="flex gap-4">
                          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                            {line.variant.product.thumbnail ? (
                              <img
                                src={line.variant.product.thumbnail.url}
                                alt={
                                  line.variant.product.thumbnail.alt ||
                                  line.variant.product.name
                                }
                                className="h-full w-full object-cover object-center"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gray-100">
                                <ShoppingBag className="h-8 w-8 text-gray-300" />
                              </div>
                            )}
                          </div>

                          <div className="flex flex-1 flex-col">
                            <div className="flex justify-between">
                              <div>
                                <h3 className="text-sm font-medium">
                                  <a
                                    href={`/products/${line.variant.product.slug}`}
                                    className="hover:text-gray-800"
                                  >
                                    {line.variant.product.name}
                                  </a>
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                  {line.variant.name}
                                </p>
                              </div>
                              <p className="text-sm font-medium">
                                {formatPrice(
                                  line.variant.pricing.price.gross.amount * line.quantity,
                                  line.variant.pricing.price.gross.currency
                                )}
                              </p>
                            </div>

                            <div className="flex flex-1 items-end justify-between">
                              <div className="flex items">
                                <button
                                  onClick={() =>
                                    updateItem(line.id, line.quantity - 1)
                                  }
                                  disabled={isLoading || line.quantity <= 1}
                                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="text-sm w-8 text-center">
                                  {line.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateItem(line.id, line.quantity + 1)
                                  }
                                  disabled={isLoading}
                                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>

                              <button
                                onClick={() => removeItem(line.id)}
                                disabled={isLoading}
                                className="text-sm font-medium text-red-600 hover:text-red-500 disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
                  <div className="flex justify-between text-base font-medium text-gray-900">
                    <p>Subtotal</p>
                    <p>
                      {cart?.subtotal
                        ? formatPrice(
                            cart.subtotal.gross.amount,
                            cart.subtotal.gross.currency
                          )
                        : formatPrice(0, "USD")}
                    </p>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Shipping and taxes calculated at checkout.
                  </p>
                  <div className="mt-6">
                    <a
                      href="/checkout"
                      className="flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700"
                    >
                      Checkout
                    </a>
                  </div>
                  <div className="mt-6 flex justify-center text-center text-sm text-gray-500">
                    <p>
                      or{" "}
                      <button
                        type="button"
                        className="font-medium text-indigo-600 hover:text-indigo-500"
                        onClick={closeCart}
                      >
                        Continue Shopping
                        <span aria-hidden="true"> &rarr;</span>
                      </button>
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
