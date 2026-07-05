"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getSaleorClient } from "@/lib/saleor";
import {
  GET_CHECKOUT_QUERY,
  UPDATE_CHECKOUT_ADDRESS_MUTATION,
  UPDATE_CHECKOUT_EMAIL_MUTATION,
  UPDATE_DELIVERY_METHOD_MUTATION,
} from "@/graphql/checkout";

export type PaymentMethod = "pickup" | "pesapal" | "paypal";

export interface Address {
  id?: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  streetAddress1: string;
  streetAddress2?: string;
  city: string;
  countryArea?: string;
  postalCode: string;
  country: {
    code: string;
    country: string;
  };
  phone?: string;
}

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
      thumbnail?: { url: string; alt?: string };
    };
    pricing: {
      price: { amount: number; currency: string };
    };
  };
}

export interface DeliveryMethod {
  __typename: "ShippingMethod" | "Warehouse";
  id: string;
  name: string;
}

export interface CollectionPoint {
  id: string;
  name: string;
  clickAndCollectOption?: string;
}

export interface Checkout {
  id: string;
  email: string;
  shippingAddress?: Address;
  billingAddress?: Address;
  lines: CartLine[];
  subtotal: { gross: { amount: number; currency: string } };
  shippingPrice?: { gross: { amount: number; currency: string } };
  total: { gross: { amount: number; currency: string } };
  isShippingRequired?: boolean;
  availableShippingMethods: {
    id: string;
    name: string;
    price: { amount: number; currency: string };
  }[];
  availableCollectionPoints?: CollectionPoint[];
  shippingMethod?: { id: string; name: string };
  deliveryMethod?: DeliveryMethod;
}

interface CheckoutContextType {
  checkout: Checkout | null;
  isLoading: boolean;
  isInitializing: boolean;
  step: "information" | "shipping" | "payment" | "review";
  setStep: (step: "information" | "shipping" | "payment" | "review") => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  updateAddress: (address: Address, type: "shipping" | "billing", opts?: { skipStepChange?: boolean }) => Promise<Checkout | null>;
  updateEmail: (email: string) => Promise<void>;
  updateDeliveryMethod: (methodId: string) => Promise<void>;
  completeCheckout: () => Promise<{ orderId?: string; redirectUrl?: string; error?: string }>;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [step, setStep] = useState<"information" | "shipping" | "payment" | "review">("information");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pickup");

  const client = getSaleorClient();

  const fetchCheckout = useCallback(async (checkoutId: string) => {
    try {
      const result = await client.query(GET_CHECKOUT_QUERY, { checkoutId });
      return result.data?.checkout || null;
    } catch (error) {
      console.error("Error fetching checkout:", error);
      return null;
    }
  }, [client]);

  useEffect(() => {
    async function initCheckout() {
      if (typeof window === "undefined") { setIsInitializing(false); return; }

      const cartId = localStorage.getItem("cartId");
      if (!cartId) { setIsInitializing(false); return; }

      const checkoutData = await fetchCheckout(cartId);
      if (checkoutData) {
        setCheckout(checkoutData);
        if (checkoutData.deliveryMethod || checkoutData.shippingMethod) {
          setStep("payment");
        } else if (checkoutData.shippingAddress) {
          setStep("shipping");
        }
      }
      setIsInitializing(false);
    }
    initCheckout();
  }, [fetchCheckout]);

  const updateAddress = useCallback(
    async (address: Address, _type: "shipping" | "billing", opts?: { skipStepChange?: boolean }): Promise<Checkout | null> => {
      if (!checkout) return null;
      setIsLoading(true);

      try {
        // Map the UI Address (nested country object) to Saleor's AddressInput
        // (country is a CountryCode string). Drops the client-only `id` field.
        const addressInput = {
          firstName: address.firstName,
          lastName: address.lastName,
          companyName: address.companyName || undefined,
          streetAddress1: address.streetAddress1,
          streetAddress2: address.streetAddress2 || undefined,
          city: address.city,
          countryArea: address.countryArea || undefined,
          postalCode: address.postalCode,
          country: address.country.code,
          phone: address.phone || undefined,
        };

        const result = await client.mutation(UPDATE_CHECKOUT_ADDRESS_MUTATION, {
          checkoutId: checkout.id,
          address: addressInput,
        });

        const errors = [
          ...(result.data?.checkoutShippingAddressUpdate?.errors ?? []),
          ...(result.data?.checkoutBillingAddressUpdate?.errors ?? []),
        ];
        if (errors.length) {
          console.error("Error updating address:", errors);
          return null;
        }

        // Re-fetch to hydrate delivery methods/collection points now available
        // for the entered address.
        const fresh = await fetchCheckout(checkout.id);
        if (fresh) setCheckout(fresh);
        if (!opts?.skipStepChange) setStep("shipping");
        return fresh;
      } catch (error) {
        console.error("Error updating address:", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [checkout, client, fetchCheckout]
  );

  const updateEmail = useCallback(
    async (email: string) => {
      if (!checkout) return;
      setIsLoading(true);

      try {
        const result = await client.mutation(UPDATE_CHECKOUT_EMAIL_MUTATION, {
          checkoutId: checkout.id,
          email,
        });

        if (result.data?.checkoutEmailUpdate?.checkout) {
          setCheckout(result.data.checkoutEmailUpdate.checkout);
        }
      } catch (error) {
        console.error("Error updating email:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [checkout, client]
  );

  const updateDeliveryMethod = useCallback(
    async (methodId: string) => {
      if (!checkout) return;
      setIsLoading(true);

      try {
        // Re-fetch after the mutation: checkoutDeliveryMethodUpdate returns a
        // partial checkout, so we refresh to keep addresses/lines/totals intact.
        const result = await client.mutation(UPDATE_DELIVERY_METHOD_MUTATION, {
          checkoutId: checkout.id,
          deliveryMethodId: methodId,
        });

        if (result.data?.checkoutDeliveryMethodUpdate?.checkout) {
          const fresh = await fetchCheckout(checkout.id);
          if (fresh) setCheckout(fresh);
          setStep("payment");
        } else if (result.data?.checkoutDeliveryMethodUpdate?.errors?.length) {
          console.error(
            "Delivery method error:",
            result.data.checkoutDeliveryMethodUpdate.errors
          );
        }
      } catch (error) {
        console.error("Error updating delivery method:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [checkout, client, fetchCheckout]
  );

  const completeCheckout = useCallback(async () => {
    if (!checkout) return { error: "No checkout found" };
    setIsLoading(true);

    try {
      // Server routes hold the Saleor app token (HANDLE_PAYMENTS) and drive the
      // transaction + checkoutComplete flow. Pickup returns an order id directly;
      // PesaPal/PayPal return a gateway redirect URL.
      const endpoint =
        paymentMethod === "pickup"
          ? "/api/checkout/complete"
          : `/api/payments/${paymentMethod}/initiate`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId: checkout.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { error: data?.error || "Failed to complete checkout" };
      }

      if (data.orderId) {
        localStorage.removeItem("cartId");
        return { orderId: data.orderId };
      }
      if (data.redirectUrl) {
        return { redirectUrl: data.redirectUrl };
      }
      return { error: "Unexpected response from payment service" };
    } catch (error) {
      console.error("Error completing checkout:", error);
      return { error: "Failed to complete checkout" };
    } finally {
      setIsLoading(false);
    }
  }, [checkout, paymentMethod]);

  return (
    <CheckoutContext.Provider
      value={{
        checkout,
        isLoading,
        isInitializing,
        step,
        setStep,
        paymentMethod,
        setPaymentMethod,
        updateAddress,
        updateEmail,
        updateDeliveryMethod,
        completeCheckout,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (context === undefined) {
    throw new Error("useCheckout must be used within a CheckoutProvider");
  }
  return context;
}
