import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Refunds and Returns",
  description: `Returns, refund, and damage claim policy for ${siteConfig.name}.`,
};

const UPDATED = "2 July 2026";

export default function RefundReturnsPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Refunds and Returns</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {UPDATED}</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">

          <section>
            <div className="bg-green-50 border border-green-100 rounded-lg p-5">
              <p className="font-semibold text-green-900 mb-1">Our commitment</p>
              <p className="text-green-800 text-sm">
                We want you to be delighted with your print. If something is wrong, contact us and we will make it right.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Return window</h2>
            <p>
              You may return eligible items within <strong>14 days of delivery</strong> (or collection from the studio). To initiate a return, email <a href={`mailto:${siteConfig.contact.email}`} className="text-indigo-600 underline">{siteConfig.contact.email}</a> with:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your order number</li>
              <li>The item(s) you wish to return</li>
              <li>The reason for the return</li>
              <li>Photos if the item is damaged or incorrect</li>
            </ul>
            <p className="mt-3">We will respond within 2 business days with return instructions.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Eligible returns</h2>
            <p>Items are returnable if they are:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>In original, unused condition</li>
              <li>In original packaging (or equivalent protective packaging)</li>
              <li>Not in the excluded categories below</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Non-returnable items</h2>
            <p>The following cannot be returned unless defective or misdescribed:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Custom-size prints ordered to specification</li>
              <li>Signed or numbered limited-edition prints (where this is stated in the listing)</li>
              <li>Items that have been framed, handled, or altered after receipt</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Return shipping</h2>
            <p>
              <strong>Customer-paid</strong> — unless the item is defective, misdescribed, or was damaged in transit, return shipping is at your cost. We recommend using a tracked service, as we cannot be responsible for returns lost in transit.
            </p>
            <p className="mt-2">
              <strong>We pay return shipping</strong> — if the item is faulty, misdescribed, or we sent the wrong product.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Refunds</h2>
            <p>
              Once we receive and inspect the returned item, we will process a refund to your original payment method within <strong>5–10 business days</strong>. You will receive an email confirmation. Outbound shipping costs are non-refundable unless the return is due to our error.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Damaged in transit</h2>
            <p>
              If your order arrives damaged, email us within <strong>48 hours of receipt</strong> with:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your order number</li>
              <li>Clear photos of the damaged item</li>
              <li>Photos of the packaging (please keep the packaging until the claim is resolved)</li>
            </ul>
            <p className="mt-3">We will offer a replacement or full refund — whichever you prefer — and cover all return shipping costs.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Studio collection returns</h2>
            <p>
              If you collected your order from the studio and there is a problem, please contact us within 14 days. You may return the item to the studio directly (appointment recommended) or we can arrange an alternative resolution.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Statutory rights</h2>
            <p>
              Nothing in this policy affects your statutory rights under applicable consumer protection law. If you have any doubt about your rights, you may seek independent advice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact us</h2>
            <p>
              Email: <a href={`mailto:${siteConfig.contact.email}`} className="text-indigo-600 underline">{siteConfig.contact.email}</a><br />
              Phone: <a href={`tel:${siteConfig.contact.phone}`} className="text-indigo-600 underline">{siteConfig.contact.phoneDisplay}</a><br />
              We aim to respond within 2 business days.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
