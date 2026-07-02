import { NextResponse } from "next/server";
import { gql } from "graphql-tag";
import { saleorAdmin } from "@/lib/saleor-server";
import { paypalPost } from "@/lib/paypal";

const CHECKOUT_FOR_PAYMENT_QUERY = gql`
  query CheckoutForPayment($id: ID!) {
    checkout(id: $id) {
      id
      totalPrice {
        gross {
          amount
          currency
        }
      }
    }
  }
`;

type CheckoutForPayment = {
  checkout: {
    id: string;
    totalPrice: { gross: { amount: number; currency: string } };
  } | null;
};

type PayPalOrderResponse = {
  id: string;
  status: string;
  links: Array<{ href: string; rel: string; method: string }>;
  error_description?: string;
  message?: string;
};

export async function POST(request: Request) {
  let checkoutId: string | undefined;
  try {
    const body = await request.json();
    checkoutId = body?.checkoutId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!checkoutId) {
    return NextResponse.json({ error: "checkoutId is required" }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL is not set" }, { status: 500 });
  }

  try {
    const { checkout } = await saleorAdmin<CheckoutForPayment>(CHECKOUT_FOR_PAYMENT_QUERY, {
      id: checkoutId,
    });

    if (!checkout) {
      return NextResponse.json({ error: "Checkout not found" }, { status: 404 });
    }

    const { amount, currency } = checkout.totalPrice.gross;

    const order = await paypalPost<PayPalOrderResponse>("/v2/checkout/orders", {
      intent: "CAPTURE",
      purchase_units: [
        {
          // Store checkoutId so we can retrieve it in the capture route.
          custom_id: checkoutId,
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
          description: "Dennis Muraguri Art Prints",
        },
      ],
      application_context: {
        return_url: `${siteUrl}/checkout/return?provider=paypal`,
        cancel_url: `${siteUrl}/checkout/return?cancelled=1`,
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
      },
    });

    if (order.message || order.error_description) {
      return NextResponse.json(
        { error: order.message || order.error_description, raw: order },
        { status: 400 }
      );
    }

    const approvalLink = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve");
    if (!approvalLink) {
      return NextResponse.json(
        { error: "PayPal did not return an approval URL", raw: order },
        { status: 502 }
      );
    }

    return NextResponse.json({ redirectUrl: approvalLink.href, paypalOrderId: order.id });
  } catch (err) {
    console.error("PayPal initiate failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment initiation failed" },
      { status: 500 }
    );
  }
}
