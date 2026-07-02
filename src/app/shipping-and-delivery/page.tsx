import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Shipping and Delivery",
  description: `Shipping options, timelines, and studio collection details for ${siteConfig.name}.`,
};

const UPDATED = "2 July 2026";

export default function ShippingAndDeliveryPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Shipping and Delivery</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {UPDATED}</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Studio collection (free)</h2>
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-5 space-y-2">
              <p className="font-semibold text-indigo-900">Recommended for Nairobi buyers</p>
              <p><strong>Location:</strong> {siteConfig.studio.name}</p>
              <p><strong>Address:</strong> {siteConfig.studio.address}</p>
              <p><strong>Cost:</strong> Free</p>
              <p>
                <a
                  href={siteConfig.studio.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline"
                >
                  Get directions on Google Maps
                </a>
              </p>
            </div>
            <ul className="list-disc pl-5 mt-4 space-y-2">
              <li>An appointment is strongly recommended. Contact us at <a href={`tel:${siteConfig.contact.phone}`} className="text-indigo-600 underline">{siteConfig.contact.phoneDisplay}</a> or <a href={`mailto:${siteConfig.contact.email}`} className="text-indigo-600 underline">{siteConfig.contact.email}</a> to arrange a convenient time.</li>
              <li>Please bring the order confirmation email (printed or on your phone) and a photo ID matching the name on the order.</li>
              <li>Risk in the goods passes to you at the point of collection.</li>
              <li>If you cannot collect within 14 days of your order confirmation, please contact us to make alternative arrangements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Postal and courier shipping</h2>
            <p>Prints are shipped flat-packed or rolled in a protective tube depending on size. All orders are carefully packed to prevent damage in transit.</p>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Region</th>
                    <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Estimated delivery</th>
                    <th className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">Kenya (outside Nairobi)</td>
                    <td className="border border-gray-200 px-4 py-2">3–7 business days</td>
                    <td className="border border-gray-200 px-4 py-2">Domestic courier</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-4 py-2">East Africa (EA)</td>
                    <td className="border border-gray-200 px-4 py-2">5–10 business days</td>
                    <td className="border border-gray-200 px-4 py-2">Regional courier</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">Europe / UK</td>
                    <td className="border border-gray-200 px-4 py-2">10–21 business days</td>
                    <td className="border border-gray-200 px-4 py-2">International courier; customs may extend</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-4 py-2">North America / US</td>
                    <td className="border border-gray-200 px-4 py-2">10–21 business days</td>
                    <td className="border border-gray-200 px-4 py-2">International courier; customs may extend</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">Rest of world</td>
                    <td className="border border-gray-200 px-4 py-2">14–30 business days</td>
                    <td className="border border-gray-200 px-4 py-2">Varies by country</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-sm text-gray-500">
              Delivery estimates start from dispatch, not order date. We typically dispatch within 1–3 business days of receiving cleared payment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Customs, duties, and import taxes</h2>
            <p>
              For international orders, <strong>the buyer is the importer of record</strong>. Any customs duties, import VAT, brokerage fees, or other charges levied by the destination country are the buyer&apos;s sole responsibility. We cannot predict these costs — check with your local customs authority before ordering.
            </p>
            <p className="mt-2">
              If you refuse to pay customs fees and the parcel is returned to us, we will refund the product price minus outbound shipping costs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Tracking</h2>
            <p>
              Where a tracking number is available, we will include it in your dispatch confirmation email. Not all shipping routes provide end-to-end tracking.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Lost or delayed parcels</h2>
            <p>
              If your parcel has not arrived within the estimated window, please contact us at <a href={`mailto:${siteConfig.contact.email}`} className="text-indigo-600 underline">{siteConfig.contact.email}</a> with your order number. Please report non-arrival within 30 days of the dispatch date so we can investigate with the carrier.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Damaged in transit</h2>
            <p>
              If your order arrives damaged, please email us within <strong>48 hours of receipt</strong> with your order number and clear photos of the damaged item and packaging. We will arrange a replacement or refund. See our <a href="/refund-returns" className="text-indigo-600 underline">Refunds &amp; Returns</a> page for the full process.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Questions?</h2>
            <p>
              Email <a href={`mailto:${siteConfig.contact.email}`} className="text-indigo-600 underline">{siteConfig.contact.email}</a> or call <a href={`tel:${siteConfig.contact.phone}`} className="text-indigo-600 underline">{siteConfig.contact.phoneDisplay}</a>. We aim to respond within 2 business days.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
