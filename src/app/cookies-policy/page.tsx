import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookies Policy",
  description: `How ${siteConfig.name} uses cookies and how to manage your preferences.`,
};

const UPDATED = "2 July 2026";

export default function CookiesPolicyPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cookies Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {UPDATED}</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">What are cookies?</h2>
            <p>
              Cookies are small text files stored on your device by your browser when you visit a website. We also use browser <code>localStorage</code> for similar purposes. This policy covers both.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Cookies we use</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Name</th>
                    <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Type</th>
                    <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Storage</th>
                    <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Duration</th>
                    <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Purpose</th>
                    <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Consent required?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2 font-mono text-xs">saleor_auth_token</td>
                    <td className="border border-gray-200 px-4 py-2">Essential</td>
                    <td className="border border-gray-200 px-4 py-2">Cookie</td>
                    <td className="border border-gray-200 px-4 py-2">Session / 30 days</td>
                    <td className="border border-gray-200 px-4 py-2">Keeps you logged in to your account</td>
                    <td className="border border-gray-200 px-4 py-2">No</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-4 py-2 font-mono text-xs">cartId</td>
                    <td className="border border-gray-200 px-4 py-2">Essential</td>
                    <td className="border border-gray-200 px-4 py-2">localStorage</td>
                    <td className="border border-gray-200 px-4 py-2">Until cleared</td>
                    <td className="border border-gray-200 px-4 py-2">Remembers your shopping cart between visits</td>
                    <td className="border border-gray-200 px-4 py-2">No</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2 font-mono text-xs">cookie-consent</td>
                    <td className="border border-gray-200 px-4 py-2">Essential</td>
                    <td className="border border-gray-200 px-4 py-2">localStorage</td>
                    <td className="border border-gray-200 px-4 py-2">1 year</td>
                    <td className="border border-gray-200 px-4 py-2">Records your cookie consent choice</td>
                    <td className="border border-gray-200 px-4 py-2">No</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-4 py-2 font-mono text-xs">Analytics cookies</td>
                    <td className="border border-gray-200 px-4 py-2">Analytics</td>
                    <td className="border border-gray-200 px-4 py-2">Cookie</td>
                    <td className="border border-gray-200 px-4 py-2">Up to 2 years</td>
                    <td className="border border-gray-200 px-4 py-2">Understanding how visitors use the site (not yet active)</td>
                    <td className="border border-gray-200 px-4 py-2"><strong>Yes</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Two categories</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-1">Essential cookies</h3>
                <p className="text-sm">
                  These are required for the website to function. Without them you cannot log in, add items to your cart, or complete a purchase. We do not require your consent to set these cookies, as they are strictly necessary for the service you have requested.
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-1">Analytics &amp; marketing cookies</h3>
                <p className="text-sm">
                  These cookies help us understand how visitors interact with the site so we can improve it. They are not yet active. When we enable them, we will ask for your consent first via the cookie banner. You can withdraw consent at any time (see below).
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Managing your preferences</h2>
            <p>You can manage cookies in two ways:</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>
                <strong>Cookie banner</strong>: When you first visit the site, a banner lets you accept all cookies or reject non-essential ones. You can revisit this by clearing your browser&apos;s localStorage for this site and refreshing.
              </li>
              <li>
                <strong>Browser settings</strong>: Most browsers let you block or delete cookies. Note that blocking essential cookies will prevent the site from working correctly. See your browser&apos;s help documentation for instructions.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Third-party cookies</h2>
            <p>
              Payment providers (PesaPal, PayPal) may set their own cookies when you use their payment forms. These are governed by their own privacy and cookie policies. We recommend reviewing them before payment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">More information</h2>
            <p>
              This policy should be read alongside our{" "}
              <Link href="/privacy-policy" className="text-indigo-600 underline">Privacy Policy</Link>. For questions, contact{" "}
              <a href={`mailto:${siteConfig.contact.email}`} className="text-indigo-600 underline">{siteConfig.contact.email}</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
