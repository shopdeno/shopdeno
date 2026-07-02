import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async redirects() {
    return [
      // WooCommerce product URLs → new storefront
      {
        source: "/shop/:slug*",
        destination: "/products/:slug*",
        permanent: true,
      },
      {
        source: "/product/:slug",
        destination: "/products/:slug",
        permanent: true,
      },
      // WooCommerce category URLs → new storefront
      {
        source: "/product-category/:slug",
        destination: "/categories/:slug",
        permanent: true,
      },
      // WooCommerce cart/checkout/account
      {
        source: "/cart",
        destination: "/checkout",
        permanent: false,
      },
      {
        source: "/my-account/:path*",
        destination: "/account/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    // Next 16 blocks optimizing images from private IPs (SSRF guard). The local
    // docker Saleor is 127.0.0.1, so serve images unoptimized in dev only.
    // Production (public Saleor Cloud host) keeps full optimization.
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.saleor.cloud",
      },
      {
        protocol: "https",
        hostname: "**.mirumee.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Local Saleor (docker) media host used during development.
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
      },
    ],
  },
};

export default nextConfig;
