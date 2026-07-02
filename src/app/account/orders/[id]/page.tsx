"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getSaleorClient } from "@/lib/saleor";
import { ORDER_DETAIL_QUERY } from "@/graphql/auth";
import { Loader2 } from "lucide-react";

interface Money {
  gross: { amount: number; currency: string };
}
interface OrderLine {
  id: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: Money;
  totalPrice: Money;
}
interface OrderAddress {
  firstName: string;
  lastName: string;
  streetAddress1: string;
  streetAddress2?: string;
  city: string;
  postalCode: string;
  country: { code: string; country: string };
}
interface Order {
  id: string;
  number: string;
  created: string;
  status: string;
  subtotal: Money;
  shippingPrice: Money;
  total: Money;
  shippingAddress?: OrderAddress;
  billingAddress?: OrderAddress;
  lines: OrderLine[];
}

function money(m?: Money) {
  if (!m) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: m.gross.currency }).format(m.gross.amount);
}

function AddressBlock({ title, address }: { title: string; address?: OrderAddress }) {
  if (!address) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
      <div className="text-sm text-gray-600">
        <p>{address.firstName} {address.lastName}</p>
        <p>{address.streetAddress1}</p>
        {address.streetAddress2 && <p>{address.streetAddress2}</p>}
        <p>{address.city}, {address.postalCode}</p>
        <p>{address.country.country}</p>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/account/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function fetchOrder() {
      if (!isAuthenticated || !params?.id) return;
      try {
        const result = await getSaleorClient().query(ORDER_DETAIL_QUERY, { id: params.id });
        if (result.data?.order) {
          setOrder(result.data.order);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error("Error fetching order:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [isAuthenticated, params?.id]);

  if (authLoading || !isAuthenticated || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">Order not found.</p>
        <Link href="/account" className="text-indigo-600 hover:text-indigo-500 font-medium">
          ← Back to account
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700 mb-2 block">
          ← Back to account
        </Link>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Order #{order.number}</h1>
          <span className="text-xs bg-gray-200 text-gray-800 px-3 py-1 rounded-full">{order.status}</span>
        </div>

        <p className="text-sm text-gray-500 mb-8">
          Placed {new Date(order.created).toLocaleDateString()}
        </p>

        <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
          {order.lines.map((line) => (
            <div key={line.id} className="flex justify-between p-4">
              <div>
                <p className="font-medium text-gray-900">{line.productName}</p>
                {line.variantName && <p className="text-sm text-gray-500">{line.variantName}</p>}
                <p className="text-sm text-gray-500">Qty {line.quantity} × {money(line.unitPrice)}</p>
              </div>
              <p className="font-medium text-gray-900">{money(line.totalPrice)}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mt-6 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span><span>{money(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span><span>{money(order.shippingPrice)}</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span><span>{money(order.total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 bg-white rounded-lg shadow-sm p-4">
          <AddressBlock title="Shipping address" address={order.shippingAddress} />
          <AddressBlock title="Billing address" address={order.billingAddress} />
        </div>
      </div>
    </div>
  );
}
