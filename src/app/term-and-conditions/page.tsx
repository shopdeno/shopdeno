import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: `Terms governing purchases from ${siteConfig.name}.`,
};

const UPDATED = "2 July 2026";

export default function TermsAndConditionsPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms and Conditions</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {UPDATED}</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. About us</h2>
            <p>
              This store is operated by Dennis Muraguri, trading as Dennis Muraguri Art Prints, based at {siteConfig.studio.name}, {siteConfig.studio.address}. References to "<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>" mean Dennis Muraguri. Contact: <a href={`mailto:${siteConfig.contact.email}`} className="text-indigo-600 underline">{siteConfig.contact.email}</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Contract formation</h2>
            <p>
              Placing an order constitutes an offer to purchase. A contract is formed when we send you an order confirmation email. Payment processing alone does not constitute acceptance. We reserve the right to decline an order after payment — in which case we will refund the full amount promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Products and descriptions</h2>
            <p>
              All prints are high-quality A3 reproductions (approximately 420 × 297 mm) on 200 gsm archival paper unless a product listing states otherwise. Product images are accurate representations of the artwork but may vary slightly in colour due to screen calibration. Written descriptions in product listings are binding — they describe the actual artwork, sacco/route, and edition details.
            </p>
            <p className="mt-2">
              Dennis Muraguri is the original artist. All artwork is reproduced with the artist&apos;s authorisation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Pricing and payment</h2>
            <p>
              All prices are in US Dollars (USD) unless displayed otherwise. We accept M-Pesa and card via PesaPal, PayPal, and studio cash for collection orders.
            </p>
            <p className="mt-2">
              <strong>Pricing errors</strong>: if a product is listed at an obvious incorrect price due to a typographical or technical error, we are not obliged to supply it at that price. We will notify you and give you the option to purchase at the correct price or cancel for a full refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Studio collection</h2>
            <p>
              Studio pickup is available free of charge at {siteConfig.studio.name}, {siteConfig.studio.address}. An appointment is recommended — contact us at <a href={`tel:${siteConfig.contact.phone}`} className="text-indigo-600 underline">{siteConfig.contact.phoneDisplay}</a> or{" "}
              <a href={`mailto:${siteConfig.contact.email}`} className="text-indigo-600 underline">{siteConfig.contact.email}</a> to arrange a time.
            </p>
            <p className="mt-2">
              Photo ID matching the name on the order may be required. Risk in the goods passes to you at the point of collection. If you are unable to collect within 14 days of the order confirmation, please contact us to arrange an alternative.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Shipping and international orders</h2>
            <p>
              For shipped orders, see our <a href="/shipping-and-delivery" className="text-indigo-600 underline">Shipping &amp; Delivery</a> page for full details on timelines, packaging, and carriers.
            </p>
            <p className="mt-2">
              <strong>Import duties and taxes</strong>: for international orders, the buyer is the importer of record. Any customs duties, import VAT, brokerage fees, or other charges imposed by the destination country are the buyer&apos;s sole responsibility. We cannot predict or guarantee these costs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Returns and refunds</h2>
            <p>
              Please see our <a href="/refund-returns" className="text-indigo-600 underline">Refunds &amp; Returns</a> page for full details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Intellectual property</h2>
            <p>
              All artwork, images, and copy on this website are the intellectual property of Dennis Muraguri or used with permission. Purchase of a print grants you a personal, non-commercial licence to display the print. It does not transfer any copyright or right to reproduce the artwork.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Complaints</h2>
            <p>
              If you have a complaint, please email <a href={`mailto:${siteConfig.contact.email}`} className="text-indigo-600 underline">{siteConfig.contact.email}</a> with your order number. We will acknowledge your complaint within 2 business days and aim to resolve it within 14 business days. If we cannot resolve the matter, we will inform you of any alternative dispute resolution options available.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, our liability to you is limited to the price you paid for the relevant product. Nothing in these terms limits liability for death or personal injury caused by negligence, fraud, or any liability that cannot lawfully be excluded.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Force majeure</h2>
            <p>
              We are not liable for delays or failures caused by events beyond our reasonable control, including natural disasters, strikes, government actions, postal disruptions, or customs delays. We will notify you promptly and offer a refund or revised timeline.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Governing law</h2>
            <p>
              These terms are governed by and construed in accordance with the laws of Kenya. Any disputes shall be subject to the exclusive jurisdiction of the Kenyan courts, without prejudice to your statutory consumer rights in your country of residence.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. Changes take effect when posted to this page. Continued use of the site after changes constitutes acceptance. For significant changes we will provide notice by email where we hold your address.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
