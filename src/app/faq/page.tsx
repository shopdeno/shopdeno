import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "FAQ",
  description: `Frequently asked questions about buying matatu art prints from ${siteConfig.name}.`,
};

const faqs = [
  {
    q: "What size are the prints?",
    a: "All standard prints are A3 (420 × 297 mm / 16.5 × 11.7 in) unless a product listing states otherwise. They are printed on 200 gsm archival-quality paper.",
  },
  {
    q: "Can I collect my order in person?",
    a: `Yes — studio collection is free and recommended for Nairobi buyers. Pick up from ${siteConfig.studio.name}, ${siteConfig.studio.address}. Contact us on ${siteConfig.contact.phoneDisplay} or ${siteConfig.contact.email} to arrange a time.`,
  },
  {
    q: "How long does shipping take?",
    a: "Within Kenya (outside Nairobi): 3–7 business days. East Africa: 5–10 business days. Europe and North America: 10–21 business days. International deliveries may be delayed by customs. See our Shipping & Delivery page for full details.",
  },
  {
    q: "Do I have to pay customs or import duties?",
    a: "For international orders, you are the importer of record. Any customs duties, import VAT, or brokerage fees charged by your country are your responsibility. We recommend checking with your local customs authority before ordering. We declare the full value of goods on all customs documents.",
  },
  {
    q: "What payment methods do you accept?",
    a: "M-Pesa, Airtel Money, Visa, Mastercard, and Amex via PesaPal (for Kenya and regional buyers). PayPal for international buyers. Cash on collection at the studio.",
  },
  {
    q: "Are the prints authentic Dennis Muraguri originals?",
    a: "The prints are high-quality reproductions of original Dennis Muraguri artwork, sold directly by the artist. They are not unique originals (paintings or drawings) unless a listing specifically describes them as such. Each reproduction is printed on archival paper.",
  },
  {
    q: "Can I return a print if I change my mind?",
    a: "Yes — within 14 days of delivery or collection, subject to the item being unused and in its original packaging. See our Refunds & Returns page for the full process. Custom sizes and signed limited editions may not be eligible for return.",
  },
  {
    q: "What if my print arrives damaged?",
    a: "Email us within 48 hours of receipt with your order number and photos of the damage and packaging. We will arrange a replacement or full refund and cover all return shipping costs.",
  },
  {
    q: "How do I care for and hang the print?",
    a: "Keep prints away from direct sunlight to prevent fading. Frame behind UV-protective glass for best longevity. When handling, hold from the edges or use cotton gloves to avoid fingerprints on the paper surface.",
  },
  {
    q: "How do I get in touch?",
    a: `Email ${siteConfig.contact.email} or call ${siteConfig.contact.phoneDisplay}. We aim to respond within 2 business days.`,
  },
];

export default function FAQPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Frequently Asked Questions</h1>
        <p className="text-gray-600 mb-10">
          Can&apos;t find your answer here?{" "}
          <a href={`mailto:${siteConfig.contact.email}`} className="text-indigo-600 underline">
            Email us
          </a>{" "}
          and we&apos;ll get back to you within 2 business days.
        </p>

        <div className="space-y-3">
          {faqs.map(({ q, a }) => (
            <details
              key={q}
              className="group border border-gray-200 rounded-lg overflow-hidden"
            >
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none hover:bg-gray-50">
                <span className="font-medium text-gray-900">{q}</span>
                <svg
                  className="h-5 w-5 text-gray-400 flex-shrink-0 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5 text-gray-700 text-sm leading-relaxed border-t border-gray-100 pt-4">
                {a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
