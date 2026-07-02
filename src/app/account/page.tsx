"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getSaleorClient } from "@/lib/saleor";
import { CUSTOMER_QUERY, ORDERS_QUERY } from "@/graphql/auth";
import { Package, MapPin, User, LogOut, Loader2 } from "lucide-react";

interface Order {
  id: string;
  number: string;
  created: string;
  status: string;
  total: { gross: { amount: number; currency: string } };
}

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/account/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function fetchOrders() {
      if (!isAuthenticated) return;

      try {
        const client = getSaleorClient();
        const result = await client.query(ORDERS_QUERY, { first: 5 });
        if (result.data?.me?.orders?.edges) {
          setOrders(result.data.me.orders.edges.map((e: any) => e.node));
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Account</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>

              <nav className="space-y-2">
                <Link
                  href="/account"
                  className="flex items-center gap-3 px-3 py-2 text-gray-900 bg-gray-50 rounded-md"
                >
                  <Package className="h-5 w-5" />
                  Orders
                </Link>
                <Link
                  href="/account/addresses"
                  className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
                >
                  <MapPin className="h-5 w-5" />
                  Addresses
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md w-full"
                >
                  <LogOut className="h-5 w-5" />
                  Sign out
                </button>
              </nav>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Orders</h2>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No orders yet</p>
                  <Link
                    href="/collections"
                    className="text-indigo-600 font-medium hover:text-indigo-500"
                  >
                    Start shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          Order #{order.number}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(order.created)}
                        </p>
                        <p className="text-sm text-gray-500 capitalize mt-1">
                          Status: {order.status.toLowerCase().replace(/_/g, " ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatPrice(order.total.gross.amount, order.total.gross.currency)}
                        </p>
                        <Link
                          href={`/account/orders/${order.id}`}
                          className="text-sm text-indigo-600 hover:text-indigo-500"
                        >
                          View details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {orders.length > 0 && (
                <div className="mt-6 text-center">
                  <Link
                    href="/account/orders"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    View all orders
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
