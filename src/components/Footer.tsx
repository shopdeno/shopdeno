import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/site-config";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Find Us */}
          <nav>
            <h6 className="text-sm font-semibold uppercase tracking-wider mb-4">Find Us</h6>
            <a
              href={siteConfig.studio.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white text-sm leading-relaxed block"
            >
              Kuona Artists Collective,<br />
              Centre for the Visual Arts,<br />
              {siteConfig.studio.address}
            </a>
            <a
              href={siteConfig.studio.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300"
            >
              <svg className="h-3.5 w-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Get Directions
            </a>
            <a
              href={`tel:${siteConfig.contact.phone}`}
              className="mt-2 flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300"
            >
              <svg className="h-3.5 w-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {siteConfig.contact.phoneDisplay}
            </a>
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className="mt-2 flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300"
            >
              <svg className="h-3.5 w-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {siteConfig.contact.email}
            </a>
          </nav>

          {/* News */}
          <nav>
            <h6 className="text-sm font-semibold uppercase tracking-wider mb-4">News</h6>
            <ul className="space-y-2">
              {siteConfig.press.map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Important Info */}
          <nav>
            <h6 className="text-sm font-semibold uppercase tracking-wider mb-4">Important Info</h6>
            <ul className="space-y-2">
              <li>
                <Link href="/account" className="text-gray-400 hover:text-white text-sm">
                  My Account
                </Link>
              </li>
              {siteConfig.legalLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-gray-400 hover:text-white text-sm">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logo */}
          <div className="flex flex-col items-end">
            <Link href="/">
              <Image
                src="/dennis-muraguri-footer-logo.avif"
                alt={siteConfig.name}
                width={160}
                height={320}
                className="w-32"
              />
            </Link>
          </div>
        </div>

        {/* Payment + security badges */}
        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-wrap items-center justify-between gap-y-3">
          {/* Payment methods — left */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-gray-500 uppercase tracking-wider mr-2">We Accept</span>
            <img
              src="/paypal-badge.png"
              alt="PayPal"
              style={{ height: 27, width: "auto", background: "#fff", padding: 3, borderRadius: 3 }}
            />
            {[
              { src: "visa.svg", alt: "Visa" },
              { src: "mastercard.svg", alt: "Mastercard" },
              { src: "amex.svg", alt: "Amex" },
              { src: "mpesa.png", alt: "M-Pesa" },
              { src: "airtel.png", alt: "Airtel Money" },
              { src: "mvisal.png", alt: "mVisa" },
              { src: "ewallet.png", alt: "Pesapal E-wallet" },
            ].map(({ src, alt }) => (
              <img
                key={src}
                src={`https://payments.pesapal.com/images/pesapal/${src}`}
                alt={alt}
                style={{
                  height: 27,
                  width: "auto",
                  background: src.endsWith(".png") ? "#fff" : undefined,
                  padding: src.endsWith(".png") ? 3 : 0,
                  borderRadius: 3,
                }}
              />
            ))}
          </div>

          {/* Security badges — right */}
          <div className="flex items-center gap-3">
            <img src="/security-badge-1.png" alt="Secure checkout" style={{ height: 27, width: "auto", background: "#fff", padding: 3, borderRadius: 3 }} />
            <img src="/security-badge-2.png" alt="SSL secured" style={{ height: 27, width: "auto", background: "#fff", padding: 3, borderRadius: 3 }} />
          </div>
        </div>

        <div className="border-t border-gray-800 mt-6 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <a
              href={siteConfig.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="text-gray-400 hover:text-white"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
            </a>
            <a
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-gray-400 hover:text-white"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a
              href={siteConfig.social.twitter}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter / X"
              className="text-gray-400 hover:text-white"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 512 512">
                <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
              </svg>
            </a>
          </div>

          <p className="text-gray-400 text-xs">
            © {currentYear} Shop@Dennis_Muraguri. All rights reserved.
          </p>

          <a
            href="mailto:studio@digitalorchard.design"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white text-xs"
          >
            Website by <strong>Digital Orchard</strong> Design
          </a>
        </div>
      </div>
    </footer>
  );
}
