// Slugs of Saleor categories that represent matatu SACCOs/routes.
// To add a SACCO: add its slug here (must already exist as a Saleor category).
// Format/style categories live here too when "Shop by Format" is added.
export const SACCO_CATEGORY_SLUGS = [
  // Named SACCOs
  "alicia-pakin-sacco",
  "eastleigh-commuter-sacco",
  "ebet-sacco",
  "expresso-sacco",
  "fastrack-u-sacco",
  "kacose-sacco",
  "luminous-sacco",
  "metro-class-sacco",
  "ngong-matatu-oa",
  "nmoa-sacco",
  "ongata-line-sacco",
  "ongata-line-transporters",
  "oromats-sacco",
  "pin-point-sacco",
  "rog-sacco",
  "rongao-sacco",
  "snowball-sacco",
  "south-b-owners-sacco",
  "umo-inner-sacco",
  // Nairobi matatu routes
  "route-8",
  "route-15",
  "route-46",
  "route-58",
  "route-125",
] as const;

// Future browse modes follow the same pattern:
// export const FORMAT_CATEGORY_SLUGS = ["landscape-format", "portrait-format", ...];
