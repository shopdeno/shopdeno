// Central brand/site configuration. Overridable via NEXT_PUBLIC_* env so the
// same code deploys for staging/prod without editing components. Defaults are
// the Dennis Muraguri matatu-art brand.

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "Dennis Muraguri Art Prints",
  shortName: "Dennis Muraguri",
  tagline: "Nairobi Matatu Street Art",
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    "Original matatu and sacco street-art prints by Nairobi artist Dennis Muraguri — high-quality reproductions celebrating Kenya's iconic matatu culture.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ogImage: "/og-image.jpg",
  twitterHandle: process.env.NEXT_PUBLIC_TWITTER_HANDLE || "",
  adminUrl:
    process.env.NEXT_PUBLIC_SALEOR_ADMIN_URL ||
    process.env.NEXT_PUBLIC_SALEOR_API_URL?.replace("/graphql/", "/dashboard/") ||
    "",
  contact: {
    phone: "+254723727924",
    phoneDisplay: "0723 727924",
    email: "sales@shop.dennis-muraguri.co.ke",
  },
  studio: {
    name: "Kuona Artists Collective, Centre for the Visual Arts",
    address: "Likoni Ln, Likoni Cl, off Denis Pritt Rd, Hurlingham, Nairobi, Kenya",
    mapsUrl:
      "https://www.google.com/maps/place/Kuona+Artists+collective,+Centre+for+the+Visual+Arts/@-1.284466,36.7888362,885m/data=!3m2!1e3!4b1!4m6!3m5!1s0x182f10ae9666a5f5:0x110f113782108cfb!8m2!3d-1.284466!4d36.7888362!16s%2Fg%2F1tdt3hvk",
    pickupNote: "Free collection/pickup available at the studio in Nairobi.",
    // Saleor Cloud warehouse ID for the Kuona click-and-collect point
    warehouseId: process.env.NEXT_PUBLIC_STUDIO_WAREHOUSE_ID || "V2FyZWhvdXNlOjAwNjQ1N2U3LWMzOTAtNDBkZC04NzljLTQ0Njc1ZmIxYTVjYw==",
  },
  social: {
    facebook: "https://www.facebook.com/muraguridenis/",
    instagram: "https://www.instagram.com/dennis_muraguri/",
    twitter: "https://x.com/dennis_muraguri",
  },
  press: [
    { name: "WeTransfer's WePresent", url: "https://wepresent.wetransfer.com/stories/dennis-muraguri-woodcut-matatu-prints" },
    { name: "1-54 Contemporary African Art Fair", url: "https://www.1-54.com/london/artist-list/muraguri-dennis/" },
    { name: "BBC News", url: "https://www.bbc.com/news/av/business-50039382" },
    { name: "Latitudes Online", url: "https://latitudes.online/artists/dennis_muraguri" },
    { name: "Circle Art Gallery", url: "https://circleartagency.com/publications/6-dennis-muraguri/" },
    { name: "Montague Contemporary", url: "https://www.montaguecontemporary.com/artists/34-dennis-muraguri/overview/" },
    { name: "The Art Space", url: "https://theartspace.co.ke/portfolio/dennis-muraguri/" },
    { name: "GravitArt", url: "https://gravitartgallery.com/head-mixed-media-sculpture-30-x-75-x-23-cm-dennis-muraguri-kenya/" },
  ],
  legalLinks: [
    { name: "FAQ", href: "/faq" },
    { name: "Contact", href: "/contact" },
    { name: "Shipping and Delivery", href: "/shipping-and-delivery" },
    { name: "Refunds and Returns", href: "/refund-returns" },
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Cookies Policy", href: "/cookies-policy" },
    { name: "Terms and Conditions", href: "/term-and-conditions" },
  ],
} as const;

/** Strip route/sacco suffixes from display names (e.g. " - Rongao Sacco", " - Route 15", " - Ngong Matatu OA"). */
export function productDisplayName(name: string): string {
  return name
    .replace(/\s*[-–]\s*.+?\s+(?:Sacco|Transporters|OA)\s*$/i, "")
    .replace(/\s*[-–]\s*Route\s+\d+\s*$/i, "")
    .trim();
}

// Products pinned to top of grid and exclusively shown in homepage stripe 1.
export const FEATURED_SLUGS = new Set([
  "attitude-nmoa-sacco",
  "bash-kacose-sacco",
  "bash-2-kacose-sacco",
  "dexter-umo-inner-sacco",
  "krooks-4057",
  "lakers-kacose-sacco",
  "matatu-and-tractor",
  "matuta-kacose-sacco",
  "minion-ebet-sacco-4046",
  "pig-society-rog-sacco-4047",
  "salt-n-peppa-expresso-sacco",
  "sugar-rongao-sacco",
  "warembo-bila-make-up-4051",
]);
