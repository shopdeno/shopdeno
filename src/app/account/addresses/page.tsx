"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getSaleorClient } from "@/lib/saleor";
import { CUSTOMER_QUERY, DELETE_ADDRESS_MUTATION, SET_DEFAULT_ADDRESS_MUTATION } from "@/graphql/auth";
import { Plus, Trash2, MapPin, Loader2 } from "lucide-react";

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  streetAddress1: string;
  streetAddress2?: string;
  city: string;
  postalCode: string;
  country: { code: string; country: string };
  phone?: string;
}

export default function AddressesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [defaultShipping, setDefaultShipping] = useState<string | null>(null);
  const [defaultBilling, setDefaultBilling] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/account/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function fetchAddresses() {
      if (!isAuthenticated) return;

      try {
        const client = getSaleorClient();
        const result = await client.query(CUSTOMER_QUERY, {});
        if (result.data?.me) {
          setAddresses(result.data.me.addresses || []);
          setDefaultShipping(result.data.me.defaultShippingAddress?.id || null);
          setDefaultBilling(result.data.me.defaultBillingAddress?.id || null);
        }
      } catch (error) {
        console.error("Error fetching addresses:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAddresses();
  }, [isAuthenticated]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;

    setDeleting(id);
    try {
      const client = getSaleorClient();
      await client.mutation(DELETE_ADDRESS_MUTATION, { id });
      setAddresses(addresses.filter((a) => a.id !== id));
    } catch (error) {
      console.error("Error deleting address:", error);
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (id: string, type: "SHIPPING" | "BILLING") => {
    try {
      const client = getSaleorClient();
      await client.mutation(SET_DEFAULT_ADDRESS_MUTATION, { id, type });
      if (type === "SHIPPING") {
        setDefaultShipping(id);
      } else {
        setDefaultBilling(id);
      }
    } catch (error) {
      console.error("Error setting default address:", error);
    }
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700 mb-2 block">
              ← Back to account
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Addresses</h1>
          </div>
          <Link
            href="/account/addresses/new"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-md hover:bg-indigo-700 text-white"
          >
            <Plus className="h-5 w-5" />
            Add Address
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No addresses saved yet</p>
            <Link
              href="/account/addresses/new"
              className="text-indigo-600 font-medium hover:text-indigo-500"
            >
              Add your first address
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {address.firstName} {address.lastName}
                    </p>
                    {address.companyName && (
                      <p className="text-sm text-gray-500">{address.companyName}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {defaultShipping === address.id && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Default Shipping
                      </span>
                    )}
                    {defaultBilling === address.id && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Default Billing
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-600 space-y-1 mb-4">
                  <p>{address.streetAddress1}</p>
                  {address.streetAddress2 && <p>{address.streetAddress2}</p>}
                  <p>
                    {address.city}, {address.postalCode}
                  </p>
                  <p>{address.country.country}</p>
                  {address.phone && <p>{address.phone}</p>}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {defaultShipping !== address.id && (
                    <button
                      onClick={() => handleSetDefault(address.id, "SHIPPING")}
                      className="text-sm text-indigo-600 hover:text-indigo-500"
                    >
                      Set as default shipping
                    </button>
                  )}
                  {defaultBilling !== address.id && (
                    <button
                      onClick={() => handleSetDefault(address.id, "BILLING")}
                      className="text-sm text-indigo-600 hover:text-indigo-500"
                    >
                      Set as default billing
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(address.id)}
                    disabled={deleting === address.id}
                    className="text-sm text-red-600 hover:text-red-500 ml-auto"
                  >
                    {deleting === address.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
