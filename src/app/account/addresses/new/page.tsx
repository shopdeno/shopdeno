"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getSaleorClient } from "@/lib/saleor";
import { CREATE_ADDRESS_MUTATION } from "@/graphql/auth";
import { Loader2 } from "lucide-react";

// Minimal country list; Saleor expects a CountryCode enum value. Extend as needed.
const COUNTRIES = [
  { code: "KE", name: "Kenya" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
];

export default function NewAddressPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    streetAddress1: "",
    streetAddress2: "",
    city: "",
    postalCode: "",
    country: "KE",
    phone: "",
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/account/login");
  }, [authLoading, isAuthenticated, router]);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await getSaleorClient().mutation(CREATE_ADDRESS_MUTATION, {
        input: {
          firstName: form.firstName,
          lastName: form.lastName,
          companyName: form.companyName || undefined,
          streetAddress1: form.streetAddress1,
          streetAddress2: form.streetAddress2 || undefined,
          city: form.city,
          postalCode: form.postalCode,
          country: form.country,
          phone: form.phone || undefined,
        },
      });
      const errors = result.data?.accountAddressCreate?.errors;
      if (errors?.length) {
        setError(errors[0].message);
        return;
      }
      router.push("/account/addresses");
    } catch (err) {
      console.error("Error creating address:", err);
      setError("Failed to save address. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const input = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/account/addresses" className="text-sm text-gray-500 hover:text-gray-700 mb-2 block">
          ← Back to addresses
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Add Address</h1>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
              <input className={input} value={form.firstName} onChange={update("firstName")} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
              <input className={input} value={form.lastName} onChange={update("lastName")} required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company (optional)</label>
            <input className={input} value={form.companyName} onChange={update("companyName")} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street address</label>
            <input className={input} value={form.streetAddress1} onChange={update("streetAddress1")} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apartment, suite, etc. (optional)</label>
            <input className={input} value={form.streetAddress2} onChange={update("streetAddress2")} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input className={input} value={form.city} onChange={update("city")} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal code</label>
              <input className={input} value={form.postalCode} onChange={update("postalCode")} required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select className={input} value={form.country} onChange={update("country")}>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input className={input} value={form.phone} onChange={update("phone")} />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save address
            </button>
            <Link
              href="/account/addresses"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
