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
    // Vercel Hobby plan has a 1,000 image optimization transformations/month limit.
    // Saleor Cloud already serves images via CloudFront CDN, so bypass Vercel's
    // optimizer entirely to avoid 402 errors when quota is exhausted.
    unoptimized: true,
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
