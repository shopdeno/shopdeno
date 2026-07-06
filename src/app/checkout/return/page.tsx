"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, XCircle, Loader2 } from "lucide-react";

type State = "loading" | "success" | "error";

function CheckoutReturn() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>("loading");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Break out of PesaPal iframe — when PesaPal redirects to callback_url inside
    // the iframe, promote the return URL to the top-level window so the full page
    // handles the confirmation, not a nested frame.
    if (typeof window !== "undefined" && window !== window.top) {
      window.top!.location.href = window.location.href;
      return;
    }

    const provider = searchParams.get("provider");
    const paypalOrderId = searchParams.get("token"); // PayPal appends ?token=
    const cancelled = searchParams.get("cancelled");

    if (cancelled) {
      setState("error");
      setError("Payment was cancelled. Your cart has been saved.");
      return;
    }

    if (provider === "paypal" && paypalOrderId) {
      fetch("/api/payments/paypal/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paypalOrderId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.orderId) {
            setOrderId(data.orderId);
            setState("success");
            localStorage.removeItem("cartId");
          } else {
            setError(data.error || "Payment could not be confirmed.");
            setState("error");
          }
        })
        .catch(() => {
          setError("Network error confirming payment.");
          setState("error");
        });
      return;
    }

    if (provider === "pesapal") {
      const trackingId = searchParams.get("OrderTrackingId");
      // PesaPal appends OrderMerchantReference = checkoutId we passed as `id`
      const checkoutId = searchParams.get("OrderMerchantReference");
      if (!trackingId || !checkoutId) {
        setError("Missing payment reference.");
        setState("error");
        return;
      }
      fetch(`/api/payments/pesapal/status?trackingId=${trackingId}&checkoutId=${checkoutId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.confirmed || data.orderId) {
            setOrderId(data.orderId ?? null);
            setState("success");
            localStorage.removeItem("cartId");
          } else if (data.pending) {
            // IPN not yet received — show holding message
            setError("Payment received — your order is being confirmed. Check your email shortly.");
            setState("error");
          } else {
            setError(data.error || "Payment could not be confirmed.");
            setState("error");
          }
        })
        .catch(() => {
          setError("Network error confirming payment.");
          setState("error");
        });
      return;
    }

    // Fallback: unknown provider or missing params
    setState("error");
    setError("Unknown payment return. If you completed payment, check your email for confirmation.");
  }, [searchParams]);

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Confirming your payment…</p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          {orderId && (
            <p className="text-gray-600 mb-6">Order number: {orderId}</p>
          )}
          <Link
            href="/"
            className="inline-block w-full bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Issue</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <Link
          href="/checkout"
          className="inline-block w-full bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 mb-3"
        >
          Back to Checkout
        </Link>
        <Link href="/" className="block text-sm text-gray-500 hover:text-gray-700">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        </div>
      }
    >
      <CheckoutReturn />
    </Suspense>
  );
}
