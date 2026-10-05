import { NextResponse } from "next/server";
import { gql } from "graphql-tag";
import { saleorAdmin } from "@/lib/saleor-server";
import { pesapalPost } from "@/lib/pesapal";
import { getUsdToKesRate, convertUsdToKes } from "@/lib/fx";
import { TRANSACTION_CREATE } from "@/graphql/transactions";

type TransactionCreateResult = {
  transactionCreate: {
    transaction: { id: string } | null;
    errors: Array<{ field: string | null; message: string; code: string }>;
  };
};

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

    const { amount: usdAmount } = checkout.totalPrice.gross; // currency is always USD (Saleor channel)
    const billing = checkout.billingAddress;

    // Convert USD → KES: PesaPal account is KES-denominated (M-Pesa).
    const fxRate = await getUsdToKesRate();
    const kesAmount = convertUsdToKes(usdAmount, fxRate);

    const payload = {
      id: checkoutId,
      currency: "KES",
      amount: kesAmount,
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

    // Create a PENDING (authorized) Saleor transaction so the reconciliation sweep can
    // discover this payment if the customer pays on M-Pesa and never returns to the tab.
    const txn = await saleorAdmin<TransactionCreateResult>(TRANSACTION_CREATE, {
      id: checkoutId,
      transaction: {
        name: "PesaPal — M-Pesa / card payment",
        pspReference: data.order_tracking_id,
        availableActions: [],
        amountAuthorized: { amount: usdAmount, currency: "USD" },
      },
      transactionEvent: {
        message: `PesaPal order submitted (trackingId: ${data.order_tracking_id})`,
        pspReference: data.order_tracking_id,
      },
    });
    if (txn.transactionCreate.errors.length) {
      // Non-fatal: log (structured, with ids — Vercel log retention is short and
      // request lines alone can't be correlated) but still return redirect.
      // Worst case the sweep has nothing to find; completion falls back to
      // creating a CHARGED transaction (verified path, 2026-10-05 live test).
      console.error("PesaPal initiate: failed to create pending transaction", {
        checkoutId,
        trackingId: data.order_tracking_id,
        errors: txn.transactionCreate.errors,
      });
    }

    return NextResponse.json({
      redirectUrl: data.redirect_url,
      trackingId: data.order_tracking_id,
      // Forward-compatible observability: today's UI ignores this; a future
      // checkout banner can surface it without an API change.
      pendingWarning:
        txn.transactionCreate.errors.length > 0
          ? `Pending payment record not created (${txn.transactionCreate.errors[0]?.message ?? "unknown error"}) — payment can still complete; reconciliation will pick it up.`
          : null,
    });
  } catch (err) {
    console.error("PesaPal initiate failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment initiation failed" },
      { status: 500 }
    );
  }
}
