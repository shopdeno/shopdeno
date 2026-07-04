"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCheckout, type Address } from "@/context/CheckoutContext";
import { siteConfig } from "@/lib/site-config";
import { Check, Loader2, ChevronLeft } from "lucide-react";

interface Cart {
  id: string;
  lines: any[];
  subtotal: { gross: { amount: number; currency: string } };
}

export function CheckoutContent({ cart: cartProp }: { cart?: Cart }) {
  const router = useRouter();
  const {
    checkout,
    step,
    setStep,
    isLoading,
    paymentMethod,
    setPaymentMethod,
    updateAddress,
    updateEmail,
    updateDeliveryMethod,
    completeCheckout,
  } = useCheckout();

  // Prefer prop (legacy SSR path), fall back to live checkout from context
  const cart: Cart | null = cartProp ?? (checkout ? {
    id: checkout.id,
    lines: checkout.lines ?? [],
    subtotal: (checkout as any).subtotal ?? (checkout as any).total ?? { gross: { amount: 0, currency: "USD" } },
  } : null);

  const [initialized, setInitialized] = useState(!!cartProp);
  useEffect(() => {
    // Give CheckoutContext time to load from localStorage before deciding to redirect
    const timer = setTimeout(() => setInitialized(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (initialized && !checkout && !cartProp) {
      router.replace("/");
    }
  }, [initialized, checkout, cartProp, router]);

  const [email, setEmail] = useState(checkout?.email || "");
  const [address, setAddress] = useState<Address>({
    firstName: "",
    lastName: "",
    companyName: "",
    streetAddress1: "",
    streetAddress2: "",
    city: "",
    countryArea: "",
    postalCode: "",
    country: { code: "US", country: "United States" },
    phone: "",
  });
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateEmail(email);
    setStep("shipping");
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAddress(address, "shipping");
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("payment");
  };

  const [orderError, setOrderError] = useState<string | null>(null);

  const handleCompleteOrder = async () => {
    setOrderError(null);
    const result = await completeCheckout();
    if (result.orderId) {
      setOrderComplete(true);
      setOrderId(result.orderId);
    } else if (result.redirectUrl) {
      // PesaPal / PayPal: hand off to the gateway; return handled by /checkout/return.
      window.location.assign(result.redirectUrl);
    } else if (result.error) {
      setOrderError(result.error);
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your order. Your order number is: {orderId}
          </p>
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

  if (!initialized || (!cart && !checkout)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-gray-900">
              {siteConfig.shortName}
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <span className={step === "information" ? "text-indigo-600 font-medium" : "text-gray-500"}>
                Information
              </span>
              <span className="text-gray-400">→</span>
              <span className={step === "shipping" ? "text-indigo-600 font-medium" : "text-gray-500"}>
                Shipping
              </span>
              <span className="text-gray-400">→</span>
              <span className={step === "payment" ? "text-indigo-600 font-medium" : "text-gray-500"}>
                Payment
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-7">
            <button
              onClick={() => step !== "information" ? setStep(step === "payment" ? "shipping" : "information") : undefined}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {step === "payment" ? "Shipping" : step === "shipping" ? "Information" : "Cart"}
            </button>

            {step === "information" && (
              <form onSubmit={handleEmailSubmit}>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h2>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="your@email.com"
                  />
                </div>

                <h2 className="text-lg font-medium text-gray-900 mb-4">Shipping Address</h2>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={address.firstName}
                      onChange={(e) => setAddress({ ...address, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={address.lastName}
                      onChange={(e) => setAddress({ ...address, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company (optional)</label>
                  <input
                    type="text"
                    value={address.companyName || ""}
                    onChange={(e) => setAddress({ ...address, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    required
                    value={address.streetAddress1}
                    onChange={(e) => setAddress({ ...address, streetAddress1: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Street address"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apartment, suite, etc. (optional)</label>
                  <input
                    type="text"
                    value={address.streetAddress2 || ""}
                    onChange={(e) => setAddress({ ...address, streetAddress2: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State / Region</label>
                    <input
                      type="text"
                      value={address.countryArea || ""}
                      onChange={(e) => setAddress({ ...address, countryArea: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g. NY"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP / Postal Code</label>
                    <input
                      type="text"
                      required
                      value={address.postalCode}
                      onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select
                    value={address.country.code}
                    onChange={(e) => setAddress({ ...address, country: { code: e.target.value, country: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                  <input
                    type="tel"
                    value={address.phone || ""}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 disabled:bg-gray-300 flex items-center justify-center"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue to Shipping"}
                </button>
              </form>
            )}

            {step === "shipping" && checkout && (
              <form onSubmit={handleShippingSubmit}>
                <div className="bg-white p-4 rounded-md border border-gray-200 mb-6">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">Contact</p>
                      <p className="text-gray-600">{checkout.email}</p>
                    </div>
                    <button type="button" onClick={() => setStep("information")} className="text-indigo-600 text-sm">
                      Change
                    </button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                    <div>
                      <p className="font-medium">Ship to</p>
                      <p className="text-gray-600">
                        {checkout.shippingAddress?.streetAddress1}, {checkout.shippingAddress?.city}
                      </p>
                    </div>
                    <button type="button" onClick={() => setStep("information")} className="text-indigo-600 text-sm">
                      Change
                    </button>
                  </div>
                </div>

                <h2 className="text-lg font-medium text-gray-900 mb-4">Delivery Method</h2>

                {(checkout.availableCollectionPoints?.length ?? 0) > 0 && (
                  <div className="space-y-3 mb-4">
                    {checkout.availableCollectionPoints!.map((point) => (
                      <label
                        key={point.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-md cursor-pointer hover:border-indigo-500"
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="delivery"
                            checked={checkout.deliveryMethod?.id === point.id}
                            onChange={() => updateDeliveryMethod(point.id)}
                            className="h-4 w-4 text-indigo-600"
                          />
                          <span className="ml-3">
                            Pick up at the studio — {point.name}
                            <span className="block text-xs text-gray-500">
                              {siteConfig.studio.pickupNote}
                            </span>
                          </span>
                        </div>
                        <span className="font-medium">Free</span>
                      </label>
                    ))}
                  </div>
                )}

                {checkout.availableShippingMethods?.length > 0 ? (
                  <div className="space-y-3 mb-6">
                    {checkout.availableShippingMethods.map((method) => (
                      <label
                        key={method.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-md cursor-pointer hover:border-indigo-500"
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="delivery"
                            checked={checkout.deliveryMethod?.id === method.id}
                            onChange={() => updateDeliveryMethod(method.id)}
                            className="h-4 w-4 text-indigo-600"
                          />
                          <span className="ml-3">{method.name}</span>
                        </div>
                        <span className="font-medium">
                          {formatPrice(method.price.gross.amount, method.price.gross.currency)}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  (checkout.availableCollectionPoints?.length ?? 0) === 0 && (
                    <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md mb-6">
                      No delivery methods available for this address.
                    </div>
                  )
                )}

                <button
                  type="submit"
                  disabled={!checkout.deliveryMethod || isLoading}
                  className="w-full bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 disabled:bg-gray-300 flex items-center justify-center"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue to Payment"}
                </button>
              </form>
            )}

            {step === "payment" && checkout && (
              <div>
                <div className="bg-white p-4 rounded-md border border-gray-200 mb-6">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">Contact</p>
                      <p className="text-gray-600">{checkout.email}</p>
                    </div>
                    <button type="button" onClick={() => setStep("information")} className="text-indigo-600 text-sm">
                      Change
                    </button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                    <div>
                      <p className="font-medium">Ship to</p>
                      <p className="text-gray-600">
                        {checkout.shippingAddress?.streetAddress1}, {checkout.shippingAddress?.city}
                      </p>
                    </div>
                    <button type="button" onClick={() => setStep("information")} className="text-indigo-600 text-sm">
                      Change
                    </button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                    <div>
                      <p className="font-medium">Method</p>
                      <p className="text-gray-600">{checkout.deliveryMethod?.name}</p>
                    </div>
                    <button type="button" onClick={() => setStep("shipping")} className="text-indigo-600 text-sm">
                      Change
                    </button>
                  </div>
                </div>

                <h2 className="text-lg font-medium text-gray-900 mb-4">Payment</h2>
                <div className="space-y-3 mb-6">
                  <label className="flex items-start p-4 border border-gray-200 rounded-md cursor-pointer hover:border-indigo-500">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "pickup"}
                      onChange={() => setPaymentMethod("pickup")}
                      className="h-4 w-4 text-indigo-600 mt-0.5"
                    />
                    <span className="ml-3">
                      Pay at studio on collection
                      <span className="block text-xs text-gray-500">
                        Reserve now, pay in person when you collect your print.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start p-4 border border-gray-200 rounded-md cursor-pointer hover:border-indigo-500">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "pesapal"}
                      onChange={() => setPaymentMethod("pesapal")}
                      className="h-4 w-4 text-indigo-600 mt-0.5"
                    />
                    <span className="ml-3">
                      PesaPal — M-Pesa / card
                      <span className="block text-xs text-gray-500">
                        Pay via M-Pesa, Visa, or Mastercard through PesaPal.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start p-4 border border-gray-200 rounded-md cursor-pointer hover:border-indigo-500">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "paypal"}
                      onChange={() => setPaymentMethod("paypal")}
                      className="h-4 w-4 text-indigo-600 mt-0.5"
                    />
                    <span className="ml-3">
                      PayPal
                      <span className="block text-xs text-gray-500">
                        Pay with PayPal, credit or debit card.
                      </span>
                    </span>
                  </label>
                </div>

                {orderError && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-md mb-6 text-sm">
                    {orderError}
                  </div>
                )}

                <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <span>
                    I agree to the{" "}
                    <Link href="/term-and-conditions" className="underline text-indigo-600" target="_blank">Terms &amp; Conditions</Link>,{" "}
                    <Link href="/privacy-policy" className="underline text-indigo-600" target="_blank">Privacy Policy</Link>, and{" "}
                    <Link href="/refund-returns" className="underline text-indigo-600" target="_blank">Returns Policy</Link>.
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleCompleteOrder}
                  disabled={isLoading || !agreedToTerms}
                  className="w-full bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 disabled:bg-gray-300 flex items-center justify-center"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Complete Order"}
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 mt-8 lg:mt-0">
            <div className="bg-gray-50 p-6 rounded-lg sticky top-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
              
              <ul className="divide-y divide-gray-200 mb-4">
                {cart!.lines.map((line: any) => (
                  <li key={line.id} className="py-4 flex gap-4">
                    <div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                      {line.variant.product.thumbnail ? (
                        <Image
                          src={line.variant.product.thumbnail.url}
                          alt={line.variant.product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
                          No Image
                        </div>
                      )}
                      <span className="absolute -top-1 -right-1 bg-gray-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {line.quantity}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{line.variant.product.name}</p>
                      <p className="text-sm text-gray-500">{line.variant.name}</p>
                    </div>
                    <p className="text-sm font-medium">
                      {formatPrice(
                        line.variant.pricing.price.gross.amount * line.quantity,
                        line.variant.pricing.price.gross.currency
                      )}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="space-y-2 border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">
                    {formatPrice(cart!.subtotal.gross.amount, cart!.subtotal.gross.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {checkout?.shippingPrice ? formatPrice(checkout.shippingPrice.gross.amount, checkout.shippingPrice.gross.currency) : "Calculated at next step"}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>
                    {formatPrice(
                      (checkout?.total?.gross?.amount || cart!.subtotal.gross.amount),
                      (checkout?.total?.gross?.currency || cart!.subtotal.gross.currency)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
