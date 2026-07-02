import { NextResponse } from "next/server";
import { gql } from "graphql-tag";
import { saleorAdmin } from "@/lib/saleor-server";
import { pesapalPost } from "@/lib/pesapal";

const CHECKOUT_FOR_PAYMENT_QUERY = gql`
  query CheckoutForPayment($id: ID!) {
    checkout(id: $id) {
      id
      email
      totalPrice {
        gross {
          amount
          currency
        }
      }
      billingAddress {
        firstName
        lastName
        phone
        countryArea
        country {
          code
        }
      }
    }
  }
`;

type CheckoutForPayment = {
  checkout: {
    id: string;
    email: string | null;
    totalPrice: { gross: { amount: number; currency: string } };
    billingAddress: {
      firstName: string;
      lastName: string;
      phone: string | null;
      countryArea: string;
      country: { code: string };
    } | null;
  } | null;
};

type PesapalSubmitResponse = {
  order_tracking_id: string;
  merchant_reference: string;
  redirect_url: string;
  error?: { error_type: string; code: string; message: string };
  status: string;
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
  const ipnId = process.env.PESAPAL_IPN_ID;
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
    const billing = checkout.billingAddress;

    const payload = {
      id: checkoutId,
      currency,
      amount,
      description: "Dennis Muraguri Art Prints — order payment",
      callback_url: `${siteUrl}/checkout/return?provider=pesapal`,
      ...(ipnId && { notification_id: ipnId }),
      billing_address: {
        email_address: checkout.email || "",
        phone_number: billing?.phone || "",
        country_code: billing?.country.code || "KE",
        first_name: billing?.firstName || "",
        last_name: billing?.lastName || "",
      },
    };

    const data = await pesapalPost<PesapalSubmitResponse>(
      "/api/Transactions/SubmitOrderRequest",
      payload
    );

    if (data.error?.code) {
      return NextResponse.json({ error: data.error.message, raw: data }, { status: 400 });
    }

    if (!data.redirect_url) {
      return NextResponse.json(
        { error: "PesaPal did not return a redirect URL", raw: data },
        { status: 502 }
      );
    }

    return NextResponse.json({
      redirectUrl: data.redirect_url,
      trackingId: data.order_tracking_id,
    });
  } catch (err) {
    console.error("PesaPal initiate failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment initiation failed" },
      { status: 500 }
    );
  }
}
