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
  try {
    const client = getSaleorClient();
    const channel = getChannel();
    const result = await client.query(MAIN_MENU_QUERY, {
      channel,
    });
    return result.data?.menu?.items || [];
  } catch (error) {
    console.error("Error fetching menu:", error);
    return [];
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const menuItems: MenuItem[] = await getMenu();

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="msapplication-TileColor" content="#4f46e5" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <Header menuItems={menuItems} />
          <main>{children}</main>
          <Footer />
          <CartDrawer />
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
