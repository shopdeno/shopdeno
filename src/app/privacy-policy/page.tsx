import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${siteConfig.name} collects, uses, and protects your personal data.`,
};

const UPDATED = "2 July 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {UPDATED}</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Who we are</h2>
            <p>
              This store is operated by Dennis Muraguri ("<strong>we</strong>", "<strong>us</strong>", "<strong>our</strong>"), trading as Dennis Muraguri Art Prints, based at {siteConfig.studio.name}, {siteConfig.studio.address}. We are the data controller for personal data collected through this website. You can contact us at{" "}
              <a href={`mailto:${siteConfig.contact.email}`} className="text-indigo-600 underline">{siteConfig.contact.email}</a>.
            </p>
            <p className="mt-2">
              This policy applies to all visitors and customers of{" "}
              <a href={siteConfig.url} className="text-indigo-600 underline">{siteConfig.url}</a>. It is governed by Kenya&apos;s Data Protection Act 2019 and any implementing regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Data we collect</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Category</th>
                    <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Data</th>
                    <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Purpose</th>
                    <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Legal basis</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">Account</td>
                    <td className="border border-gray-200 px-4 py-2">Name, email, password (hashed)</td>
                    <td className="border border-gray-200 px-4 py-2">Account management, order history</td>
                    <td className="border border-gray-200 px-4 py-2">Contract</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-4 py-2">Order</td>
                    <td className="border border-gray-200 px-4 py-2">Items ordered, price, currency</td>
                    <td className="border border-gray-200 px-4 py-2">Fulfilling your purchase</td>
                    <td className="border border-gray-200 px-4 py-2">Contract</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">Shipping</td>
                    <td className="border border-gray-200 px-4 py-2">Delivery address, phone number</td>
                    <td className="border border-gray-200 px-4 py-2">Delivering your order</td>
                    <td className="border border-gray-200 px-4 py-2">Contract</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-4 py-2">Payment reference</td>
                    <td className="border border-gray-200 px-4 py-2">Transaction ID (no card numbers stored here)</td>
                    <td className="border border-gray-200 px-4 py-2">Fraud prevention, receipts</td>
                    <td className="border border-gray-200 px-4 py-2">Legitimate interest</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">Technical</td>
                    <td className="border border-gray-200 px-4 py-2">IP address, browser type, session token</td>
                    <td className="border border-gray-200 px-4 py-2">Security, preventing abuse</td>
                    <td className="border border-gray-200 px-4 py-2">Legitimate interest</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-4 py-2">Analytics</td>
                    <td className="border border-gray-200 px-4 py-2">Page views, events (when enabled)</td>
                    <td className="border border-gray-200 px-4 py-2">Understanding site usage</td>
                    <td className="border border-gray-200 px-4 py-2">Consent</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm">
              We never store full card numbers. Payment card data is handled directly by PesaPal or PayPal under their own PCI-DSS certification.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Third parties and processors</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Saleor Commerce</strong> — our e-commerce platform provider, acting as a data processor. Your order and account data is stored on Saleor&apos;s infrastructure.</li>
              <li><strong>PesaPal</strong> — processes M-Pesa and card payments for Kenyan and regional buyers.</li>
              <li><strong>PayPal</strong> — processes card and PayPal wallet payments for international buyers.</li>
              <li><strong>Hosting provider</strong> — serves the website infrastructure.</li>
            </ul>
            <p className="mt-3">We do not sell your personal data to any third party.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. International transfers</h2>
            <p>
              Some of our processors (including Saleor and PayPal) may process data outside Kenya. Where this occurs, we rely on appropriate safeguards such as standard contractual clauses or the processor&apos;s own certification under equivalent frameworks.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Retention</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Order data</strong>: retained for 7 years to meet Kenyan tax and accounting obligations.</li>
              <li><strong>Account data</strong>: retained until you request deletion (see section 6).</li>
              <li><strong>Session tokens</strong>: expire within 30 days of inactivity.</li>
              <li><strong>Analytics data</strong>: retained per the analytics provider&apos;s policy (not yet active).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your rights</h2>
            <p>Under Kenya&apos;s Data Protection Act 2019 you have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data (subject to legal retention requirements)</li>
              <li>Object to processing based on legitimate interests</li>
              <li>Restrict processing in certain circumstances</li>
              <li>Withdraw consent at any time (where processing is based on consent)</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{" "}
              <a href={`mailto:${siteConfig.contact.email}`} className="text-indigo-600 underline">{siteConfig.contact.email}</a>{" "}
              with the subject line <em>Data Subject Request</em>. We will respond within 21 days. If you are not satisfied with our response, you may lodge a complaint with Kenya&apos;s Office of the Data Protection Commissioner (ODPC).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Children</h2>
            <p>This store is not directed at persons under 18. We do not knowingly collect data from children. If you believe a child has provided us data, contact us and we will delete it.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Security</h2>
            <p>
              We use HTTPS encryption for all data in transit. Access to order and account data is restricted to authorised personnel. Passwords are stored as one-way hashes. In the event of a data breach that poses a risk to your rights and freedoms, we will notify you and the ODPC in accordance with the Data Protection Act.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Cookies</h2>
            <p>
              We use essential cookies and local storage to operate the website (authentication, cart). For analytics cookies, we require your consent. See our{" "}
              <a href="/cookies-policy" className="text-indigo-600 underline">Cookies Policy</a> for full details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to this policy</h2>
            <p>We may update this policy from time to time. Material changes will be notified by email (where we hold your address) and by posting an updated notice on this page with a revised date.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Governing law</h2>
            <p>This policy is governed by and construed in accordance with the laws of Kenya.</p>
          </section>

        </div>
      </div>
    </div>
  );
}
