"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { saleorClient } from "@/lib/saleor";
import {
  CREATE_CART_MUTATION,
  ADD_TO_CART_MUTATION,
  UPDATE_CART_LINE_MUTATION,
  REMOVE_CART_LINE_MUTATION,
  GET_CART_QUERY,
} from "@/graphql/cart";

export interface CartLine {
  id: string;
  quantity: number;
  variant: {
    id: string;
    name: string;
    sku: string;
    product: {
      id: string;
      name: string;
      slug: string;
      thumbnail?: {
        url: string;
        alt?: string;
      };
    };
    pricing: {
      price: {
        gross: {
          amount: number;
          currency: string;
        };
      };
    };
  };
}

export interface Cart {
  id: string;
  lines: CartLine[];
  subtotal: {
    gross: {
      amount: number;
      currency: string;
    };
  };
  total: {
    gross: {
      amount: number;
      currency: string;
    };
  };
}

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CHANNEL = "default-channel";

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), []);

  const createCart = useCallback(async (lines: { variantId: string; quantity: number }[] = []) => {
    const result = await saleorClient.mutation(CREATE_CART_MUTATION, {
      channel: CHANNEL,
      lines,
    });
    if (result.data?.checkoutCreate?.checkout) {
      const newCart = result.data.checkoutCreate.checkout;
      if (typeof window !== "undefined") {
        localStorage.setItem("cartId", newCart.id);
      }
      return newCart;
    }
    return null;
  }, []);

  const fetchCart = useCallback(async (cartId: string) => {
    const result = await saleorClient.query(GET_CART_QUERY, { cartId });
    return result.data?.checkout || null;
  }, []);

  useEffect(() => {
    async function initCart() {
      if (typeof window === "undefined") return;
      const storedCartId = localStorage.getItem("cartId");
      if (storedCartId) {
        const fetchedCart = await fetchCart(storedCartId);
        if (fetchedCart) {
          setCart(fetchedCart);
        } else {
          // Stale cartId — clear it; a new cart will be created on first addItem
          localStorage.removeItem("cartId");
        }
      }
    }
    initCart();
  }, [fetchCart]);

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      setIsLoading(true);
      try {
        if (!cart) {
          const newCart = await createCart([{ variantId, quantity }]);
          if (newCart) {
            setCart(newCart);
            openCart();
          }
          return;
        }

        const result = await saleorClient.mutation(ADD_TO_CART_MUTATION, {
          id: cart.id,
          lines: [{ variantId, quantity }],
        });

        if (result.data?.checkoutLinesAdd?.checkout) {
          setCart(result.data.checkoutLinesAdd.checkout);
          openCart();
        }
      } finally {
        setIsLoading(false);
      }
    },
    [cart, createCart, openCart]
  );

  const updateItem = useCallback(
    async (lineId: string, quantity: number) => {
      if (!cart) return;

      setIsLoading(true);
      try {
        const result = await saleorClient.mutation(UPDATE_CART_LINE_MUTATION, {
          id: cart.id,
          lineId,
          quantity,
        });

        if (result.data?.checkoutLinesUpdate?.checkout) {
          setCart(result.data.checkoutLinesUpdate.checkout);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [cart]
  );

  const removeItem = useCallback(
    async (lineId: string) => {
      if (!cart) return;

      setIsLoading(true);
      try {
        const result = await saleorClient.mutation(REMOVE_CART_LINE_MUTATION, {
          id: cart.id,
          lineId,
        });

        if (result.data?.checkoutLinesDelete?.checkout) {
          setCart(result.data.checkoutLinesDelete.checkout);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [cart]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        isOpen,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        updateItem,
        removeItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
