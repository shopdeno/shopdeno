import { redirect } from "next/navigation";
import { getSaleorClient } from "@/lib/saleor";
import { GET_CART_QUERY } from "@/graphql/cart";
import { CheckoutProvider } from "@/context/CheckoutContext";
import { CheckoutContent } from "./CheckoutContent";

export default async function CheckoutPage() {
  const client = getSaleorClient();

  if (typeof window === "undefined") {
    redirect("/");
  }

  const cartId = typeof window !== "undefined" ? localStorage.getItem("cartId") : null;

  if (!cartId) {
    redirect("/");
  }

  try {
    const result = await client.query(GET_CART_QUERY, { cartId });
    const cart = result.data?.cart;

    if (!cart || cart.lines.length === 0) {
      redirect("/");
    }

    return (
      <CheckoutProvider>
        <CheckoutContent cart={cart} />
      </CheckoutProvider>
    );
  } catch (error) {
    console.error("Error loading checkout:", error);
    redirect("/");
  }
}
