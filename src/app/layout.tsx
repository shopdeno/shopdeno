import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { CookieConsent } from "@/components/CookieConsent";
import { getSaleorClient, getChannel } from "@/lib/saleor";
import { MAIN_MENU_QUERY } from "@/graphql/queries";
import { siteConfig } from "@/lib/site-config";
import { SUPABASE_MEDIA_HOST } from "@/lib/imageUtils";
import { LIVE_TIMEOUT_MS, withTimeout } from "@/lib/live-timeout";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

const SITE_NAME = siteConfig.name;
const SITE_URL = siteConfig.url;
const SITE_DESCRIPTION = siteConfig.description;
const TITLE_DEFAULT = `${SITE_NAME} — ${siteConfig.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE_DEFAULT,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ["matatu art", "Dennis Muraguri", "Nairobi street art", "sacco art", "art prints", "Kenya art"],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    images: [siteConfig.ogImage],
    ...(siteConfig.twitterHandle ? { creator: siteConfig.twitterHandle } : {}),
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

interface MenuItem {
  id: string;
  name: string;
  url?: string;
  category?: { id: string; slug: string; name: string };
  collection?: { id: string; slug: string; name: string };
}

async function getMenu() {
  // Menu is non-critical chrome: never let a sleeping Saleor hold the whole
  // layout (and every snapshot-fallback page) hostage past the timeout.
  try {
    const client = getSaleorClient();
    const channel = getChannel();
    const result = await withTimeout(
      client.query(MAIN_MENU_QUERY, { channel }).toPromise(),
      LIVE_TIMEOUT_MS,
      "main menu query",
    );
    if (result.error) throw result.error;
    return result.data?.menu?.items || [];
  } catch (error) {
    console.error("Menu query failed, rendering without menu:", error);
    return [];
  }
}

// Saleor API host for preconnect (derived from env; omitted if unparseable).
function saleorApiOrigin(): string | null {
  try {
    const url = process.env.NEXT_PUBLIC_SALEOR_API_URL;
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const menuItems: MenuItem[] = await getMenu();
  const apiOrigin = saleorApiOrigin();

  return (
    <html lang="en">
      <head>
        {/* Early connections: images + API resolve before first paint, saving
            ~200-500ms DNS+TLS for first-time visitors on image-heavy pages. */}
        <link rel="preconnect" href={SUPABASE_MEDIA_HOST} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={SUPABASE_MEDIA_HOST} />
        {apiOrigin && apiOrigin !== SUPABASE_MEDIA_HOST && (
          <>
            <link rel="preconnect" href={apiOrigin} />
            <link rel="dns-prefetch" href={apiOrigin} />
          </>
        )}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-96x96.png" type="image/png" sizes="96x96" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="msapplication-TileImage" content="/favicon-192x192.png" />
        <meta name="msapplication-TileColor" content="#4f46e5" />
        {/* Site-wide structured data: Organization + WebSite (per-page Product
            schema lives in ProductDetailClient). Static JSON — no client JS. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#organization`,
                  name: "Dennis Muraguri Art Prints",
                  url: SITE_URL,
                  logo: `${SITE_URL}/favicon-512x512.png`,
                  contactPoint: {
                    "@type": "ContactPoint",
                    telephone: siteConfig.contact.phone,
                    email: siteConfig.contact.email,
                    contactType: "sales",
                  },
                  address: {
                    "@type": "PostalAddress",
                    streetAddress: siteConfig.studio.address,
                    addressLocality: "Nairobi",
                    addressCountry: "KE",
                  },
                  sameAs: Object.values(siteConfig.social),
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: SITE_NAME,
                  description: SITE_DESCRIPTION,
                  publisher: { "@id": `${SITE_URL}/#organization` },
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <Header menuItems={menuItems} />
          <main>{children}</main>
          <Footer />
          <CartDrawer />
          <CookieConsent />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
