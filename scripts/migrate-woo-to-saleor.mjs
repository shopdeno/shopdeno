#!/usr/bin/env node
// WooCommerce -> Saleor catalog migration.
//
// Staged + idempotent. Reads WooCommerce over the WC REST API (basic auth with
// an application password) and writes to Saleor via the GraphQL admin API.
//
// Usage:
//   node scripts/migrate-woo-to-saleor.mjs <stage> [--limit N] [--status publish|draft|any] [--only <wooId>]
//
// Stages (run in order):
//   setup      - ensure Color attribute + two product types (simple, variable)
//   categories - mirror WC product categories as Saleor categories
//   products   - create/update products + variants + pricing + publish state
//   images     - download WC product image, convert avif->jpg (sips), upload
//   local-images - upload images from LOCAL_IMAGES_DIR (default: ../../product images)
//   all        - setup, categories, products, images
//
// Config via env (see defaults):
//   WC_BASE, WC_USER, WC_PASS, SALEOR_URL, SALEOR_EMAIL, SALEOR_PASSWORD, CHANNEL, WAREHOUSE
//
// Idempotency keys: category by slug, product by slug, variant by SKU. Re-runs
// update rather than duplicate.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const CFG = {
  wcBase: process.env.WC_BASE || "http://shop-deno-local.local",
  wcUser: process.env.WC_USER || "admin",
  wcPass: process.env.WC_PASS || "QF0GVwpEjlkxSwBXM8MrVS0d",
  saleorUrl: process.env.SALEOR_URL || "http://localhost:8000/graphql/",
  saleorEmail: process.env.SALEOR_EMAIL || "admin@example.com",
  saleorPassword: process.env.SALEOR_PASSWORD || "admin",
  channel: process.env.CHANNEL || "default-channel",
  warehouse: process.env.WAREHOUSE || "Default Warehouse",
};

const SIMPLE_TYPE = "Matatu Art Print";
const VARIABLE_TYPE = "Matatu Art Print (Color)";
const COLOR_ATTR = "Color";

// Maps WooCommerce color option names to hex values for Saleor SWATCH attribute.
// Unknown names get gray (#9ca3af) so swatches still render.
const COLOR_HEX = {
  red: "#dc2626", blue: "#2563eb", green: "#16a34a", black: "#111827",
  white: "#f9fafb", yellow: "#ca8a04", orange: "#ea580c", purple: "#9333ea",
  pink: "#ec4899", brown: "#92400e", gray: "#6b7280", grey: "#6b7280",
  silver: "#9ca3af", gold: "#d97706", navy: "#1e3a8a", teal: "#0d9488",
  maroon: "#9f1239", olive: "#65a30d", cyan: "#0891b2", magenta: "#c026d3",
  lime: "#84cc16", coral: "#f97316", violet: "#7c3aed", indigo: "#4f46e5",
  beige: "#d4b896", cream: "#fef9c3", turquoise: "#14b8a6",
  burgundy: "#9f1239", "light-blue": "#93c5fd", "light-burgundy": "#c4827a",
  ornage: "#ea580c", // ponytail: typo in Bash II filename, maps to orange
};
function colorToHex(name) {
  if (!name) return "#9ca3af";
  return COLOR_HEX[name.toLowerCase().trim()] ?? "#9ca3af";
}

// ---------- HTTP helpers ----------
const wcAuth = "Basic " + Buffer.from(`${CFG.wcUser}:${CFG.wcPass}`).toString("base64");

async function wc(path) {
  const url = `${CFG.wcBase}/wp-json/wc/v3/${path}`;
  const res = await fetch(url, { headers: { Authorization: wcAuth } });
  if (!res.ok) throw new Error(`WC ${path} -> ${res.status} ${await res.text()}`);
  return { data: await res.json(), total: Number(res.headers.get("x-wp-total") || 0) };
}

let SALEOR_TOKEN = null;
async function gql(query, variables = {}) {
  const res = await fetch(CFG.saleorUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(SALEOR_TOKEN ? { Authorization: `Bearer ${SALEOR_TOKEN}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error("GQL: " + JSON.stringify(json.errors));
  return json.data;
}

async function saleorLogin() {
  const d = await gql(
    `mutation($e:String!,$p:String!){tokenCreate(email:$e,password:$p){token errors{message}}}`,
    { e: CFG.saleorEmail, p: CFG.saleorPassword }
  );
  if (!d.tokenCreate.token) throw new Error("Saleor login failed: " + JSON.stringify(d.tokenCreate.errors));
  SALEOR_TOKEN = d.tokenCreate.token;
}

// ---------- utils ----------
const slugify = (s) =>
  (s || "").toString().toLowerCase().trim()
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const stripHtml = (html) =>
  (html || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();

// EditorJS rich-text JSON that Saleor stores in `description`.
function richText(html) {
  const text = stripHtml(html);
  if (!text) return null;
  const blocks = text.split(/\n{2,}/).filter(Boolean).map((t) => ({
    id: Math.random().toString(36).slice(2, 12),
    type: "paragraph",
    data: { text: t.replace(/\n/g, "<br>") },
  }));
  return JSON.stringify({ time: Date.now(), blocks, version: "2.24.3" });
}

const args = process.argv.slice(3);
const flag = (name, def = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const LIMIT = flag("limit") ? Number(flag("limit")) : Infinity;
const STATUS = flag("status", "any");
const ONLY = flag("only");

// Cached Saleor context ids
const ctx = {};
async function loadContext() {
  const d = await gql(`{
    channels{ id slug }
    warehouses(first:20){ edges{ node{ id name } } }
  }`);
  ctx.channelId = d.channels.find((c) => c.slug === CFG.channel)?.id;
  ctx.warehouseId = d.warehouses.edges.find((w) => w.node.name === CFG.warehouse)?.node.id;
  if (!ctx.channelId) throw new Error(`Channel ${CFG.channel} not found`);
  if (!ctx.warehouseId) throw new Error(`Warehouse ${CFG.warehouse} not found`);
}

// ---------- stage: setup (attribute + product types) ----------
async function findAttribute(slug) {
  const d = await gql(`query($s:[String!]){attributes(first:1,where:{slug:{oneOf:$s}}){edges{node{id slug}}}}`, { s: [slug] });
  return d.attributes.edges[0]?.node || null;
}
async function findProductType(name) {
  const d = await gql(`query($q:String){productTypes(first:5,filter:{search:$q}){edges{node{id name}}}}`, { q: name });
  return d.productTypes.edges.find((e) => e.node.name === name)?.node || null;
}

async function stageSetup() {
  // Color attribute (SWATCH type for visual swatches on storefront)
  let color = await findAttribute(slugify(COLOR_ATTR));
  if (!color) {
    const d = await gql(
      `mutation($in:AttributeCreateInput!){attributeCreate(input:$in){attribute{id slug} errors{field message}}}`,
      { in: { name: COLOR_ATTR, slug: slugify(COLOR_ATTR), type: "PRODUCT_TYPE", inputType: "SWATCH" } }
    );
    if (!d.attributeCreate.attribute) throw new Error("attr: " + JSON.stringify(d.attributeCreate.errors));
    color = d.attributeCreate.attribute;
    console.log("  created attribute Color (SWATCH)", color.id);
  } else {
    // Attempt to upgrade existing DROPDOWN attribute to SWATCH
    try {
      await gql(
        `mutation($id:ID!,$in:AttributeUpdateInput!){attributeUpdate(id:$id,input:$in){attribute{id} errors{field message}}}`,
        { id: color.id, in: { inputType: "SWATCH" } }
      );
      console.log("  attribute Color updated to SWATCH", color.id);
    } catch {
      console.warn("  could not update Color inputType to SWATCH (existing values may block it) — continuing");
    }
    console.log("  attribute Color exists", color.id);
  }
  ctx.colorAttrId = color.id;

  // Simple product type
  let simple = await findProductType(SIMPLE_TYPE);
  if (!simple) {
    const d = await gql(
      `mutation($in:ProductTypeInput!){productTypeCreate(input:$in){productType{id} errors{field message}}}`,
      { in: { name: SIMPLE_TYPE, slug: slugify(SIMPLE_TYPE), hasVariants: false, isShippingRequired: true } }
    );
    if (!d.productTypeCreate.productType) throw new Error("simple type: " + JSON.stringify(d.productTypeCreate.errors));
    simple = d.productTypeCreate.productType;
    console.log("  created product type", SIMPLE_TYPE);
  } else console.log("  product type exists", SIMPLE_TYPE);
  ctx.simpleTypeId = simple.id;

  // Variable product type (Color as variant attribute)
  let variable = await findProductType(VARIABLE_TYPE);
  if (!variable) {
    const d = await gql(
      `mutation($in:ProductTypeInput!){productTypeCreate(input:$in){productType{id} errors{field message}}}`,
      { in: { name: VARIABLE_TYPE, slug: slugify(VARIABLE_TYPE), hasVariants: true, isShippingRequired: true, variantAttributes: [ctx.colorAttrId] } }
    );
    if (!d.productTypeCreate.productType) throw new Error("variable type: " + JSON.stringify(d.productTypeCreate.errors));
    variable = d.productTypeCreate.productType;
    console.log("  created product type", VARIABLE_TYPE);
  } else console.log("  product type exists", VARIABLE_TYPE);
  ctx.variableTypeId = variable.id;
}

// ---------- stage: categories ----------
async function findCategory(slug) {
  const d = await gql(`query($s:String){category(slug:$s){id slug}}`, { s: slug });
  return d.category;
}
async function stageCategories() {
  const { data: cats } = await wc("products/categories?per_page=100&_fields=id,name,slug,description");
  let created = 0, existing = 0;
  for (const c of cats) {
    const slug = c.slug || slugify(c.name);
    if (await findCategory(slug)) { existing++; continue; }
    const d = await gql(
      `mutation($in:CategoryInput!){categoryCreate(input:$in){category{id} errors{field message}}}`,
      { in: { name: c.name, slug, description: richText(c.description) } }
    );
    if (!d.categoryCreate.category) { console.warn("  cat fail", slug, JSON.stringify(d.categoryCreate.errors)); continue; }
    created++;
  }
  console.log(`categories: ${created} created, ${existing} existing, ${cats.length} total`);
}

// ---------- stage: products ----------
async function fetchAllWcProducts() {
  let page = 1, all = [];
  for (;;) {
    const { data } = await wc(`products?per_page=100&page=${page}&status=${STATUS}`);
    all.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return all;
}

async function findProductBySlug(slug) {
  const d = await gql(`query($s:String){product(slug:$s){id slug}}`, { s: slug });
  return d.product;
}

function metaValue(p, key) {
  return (p.meta_data || []).find((m) => m.key === key)?.value || null;
}

// Slug: prefer WC's own (unique for published products); for empty-slug drafts
// derive from name AND append the Woo id to guarantee uniqueness (two products
// can share a name, e.g. "Beba Beba" and "Beba Beba!").
function productSlug(p) {
  return p.slug || `${slugify(p.name) || "dm"}-${p.id}`;
}

async function upsertProduct(p) {
  const slug = productSlug(p);
  const isVar = p.type === "variable";
  const productTypeId = isVar ? ctx.variableTypeId : ctx.simpleTypeId;
  const catSlug = p.categories?.[0] ? (p.categories[0].slug || slugify(p.categories[0].name)) : null;
  const cat = catSlug ? await findCategory(catSlug) : null;
  const seoTitle = metaValue(p, "ssp_meta_title");
  const seoDesc = metaValue(p, "ssp_meta_description");

  const input = {
    name: p.name,
    slug,
    productType: productTypeId,
    ...(cat ? { category: cat.id } : {}),
    description: richText(p.description),
    seo: { title: (seoTitle || p.name).slice(0, 70), description: (stripHtml(seoDesc) || "").slice(0, 300) },
    metadata: [{ key: "woo_id", value: String(p.id) }],
  };

  let existing = await findProductBySlug(slug);
  let productId;
  if (existing) {
    // ProductInput (update) does not accept productType — strip it.
    const { productType, ...updateInput } = input;
    const d = await gql(
      `mutation($id:ID!,$in:ProductInput!){productUpdate(id:$id,input:$in){product{id} errors{field message}}}`,
      { id: existing.id, in: updateInput }
    );
    if (!d.productUpdate.product) throw new Error("update " + slug + ": " + JSON.stringify(d.productUpdate.errors));
    productId = d.productUpdate.product.id;
  } else {
    const d = await gql(
      `mutation($in:ProductCreateInput!){productCreate(input:$in){product{id} errors{field message}}}`,
      { in: input }
    );
    if (!d.productCreate.product) throw new Error("create " + slug + ": " + JSON.stringify(d.productCreate.errors));
    productId = d.productCreate.product.id;
  }

  // Publish state from WC status
  const published = p.status === "publish";
  await gql(
    `mutation($id:ID!,$in:ProductChannelListingUpdateInput!){productChannelListingUpdate(id:$id,input:$in){errors{field message}}}`,
    { id: productId, in: { updateChannels: [{ channelId: ctx.channelId, isPublished: published, visibleInListings: published, isAvailableForPurchase: published }] } }
  );

  // Variants
  if (isVar) {
    const { data: variations } = await wc(`products/${p.id}/variations?per_page=100`);
    for (const v of variations) {
      const colorOpt = (v.attributes || []).find((a) => /colou?r/i.test(a.name))?.option || null;
      await upsertVariant(productId, v.sku || `DM-${p.id}-${v.id}`, v.regular_price || v.price || p.price, colorOpt);
    }
    if (variations.length === 0) {
      // variable product with no variations (empty draft) — create one default
      await upsertVariant(productId, p.sku || `DM-${p.id}`, p.regular_price || p.price || "50", null);
    }
  } else {
    await upsertVariant(productId, p.sku || `DM-${p.id}`, p.regular_price || p.price || "50", null);
  }
  return { productId, slug, published };
}

async function findVariantBySku(sku) {
  const d = await gql(`query($s:String){productVariant(sku:$s){id sku}}`, { s: sku });
  return d.productVariant;
}

// For SWATCH attributes, AttributeValues must have a hex `value` field.
// This pre-creates/updates the color value with the correct hex so swatches render.
async function ensureColorValue(colorName) {
  const hex = colorToHex(colorName);
  const slug = slugify(colorName);
  // Try to find existing value
  const d = await gql(
    `query($a:ID!){attribute(id:$a){choices(first:100,filter:{slugs:[$s]}){edges{node{id slug value}}}}}`.replace("$s", JSON.stringify(slug)),
    { a: ctx.colorAttrId }
  );
  const existing = d.attribute?.choices?.edges?.[0]?.node;
  if (existing) {
    if (existing.value !== hex) {
      await gql(
        `mutation($id:ID!,$in:AttributeValueUpdateInput!){attributeValueUpdate(id:$id,input:$in){attributeValue{id} errors{field message}}}`,
        { id: existing.id, in: { name: colorName, value: hex } }
      ).catch(() => {}); // non-fatal
    }
    return;
  }
  await gql(
    `mutation($a:ID!,$in:AttributeValueCreateInput!){attributeValueCreate(attribute:$a,input:$in){attributeValue{id} errors{field message}}}`,
    { a: ctx.colorAttrId, in: { name: colorName, value: hex } }
  ).catch(() => {}); // non-fatal if already exists
}

async function upsertVariant(productId, sku, price, colorName) {
  if (colorName) await ensureColorValue(colorName);
  const attributes = colorName ? [{ id: ctx.colorAttrId, values: [colorName] }] : [];
  let variant = await findVariantBySku(sku);
  if (!variant) {
    const d = await gql(
      `mutation($in:[ProductVariantBulkCreateInput!]!,$p:ID!){productVariantBulkCreate(product:$p,variants:$in){productVariants{id} errors{field message}}}`,
      { p: productId, in: [{ sku, trackInventory: false, attributes }] }
    );
    if (!d.productVariantBulkCreate.productVariants?.length)
      throw new Error("variant " + sku + ": " + JSON.stringify(d.productVariantBulkCreate.errors));
    variant = d.productVariantBulkCreate.productVariants[0];
  }
  // Price (channel listing)
  await gql(
    `mutation($id:ID!,$in:[ProductVariantChannelListingAddInput!]!){productVariantChannelListingUpdate(id:$id,input:$in){errors{field message}}}`,
    { id: variant.id, in: [{ channelId: ctx.channelId, price: String(price || "50") }] }
  );
  // Stock
  await gql(
    `mutation($id:ID!,$in:[StockInput!]!){productVariantStocksUpdate(variantId:$id,stocks:$in){errors{field message}}}`,
    { id: variant.id, in: [{ warehouse: ctx.warehouseId, quantity: 100 }] }
  );
  return variant.id;
}

async function stageProducts() {
  let products = await fetchAllWcProducts();
  if (ONLY) products = products.filter((p) => String(p.id) === String(ONLY));
  products = products.slice(0, LIMIT);
  let ok = 0, fail = 0;
  for (const p of products) {
    try {
      const r = await upsertProduct(p);
      ok++;
      console.log(`  ✓ ${p.id} ${r.slug} (${p.type}, ${r.published ? "published" : "draft"})`);
    } catch (e) {
      fail++;
      console.error(`  ✗ ${p.id} ${p.name}: ${e.message}`);
    }
  }
  console.log(`products: ${ok} ok, ${fail} failed`);
}

// ---------- stage: images ----------
async function stageImages() {
  let products = await fetchAllWcProducts();
  if (ONLY) products = products.filter((p) => String(p.id) === String(ONLY));
  products = products.slice(0, LIMIT);
  const dir = mkdtempSync(join(tmpdir(), "woo-img-"));
  let uploaded = 0, skipped = 0, fail = 0;

  for (const p of products) {
    const slug = productSlug(p);
    const prod = await findProductBySlug(slug);
    if (!prod || !p.images?.length) { skipped++; continue; }

    // Skip if product already has media
    const media = await gql(`query($id:ID!){product(id:$id){media{id}}}`, { id: prod.id });
    if (media.product?.media?.length) { skipped++; continue; }

    for (const img of p.images) {
      try {
        const src = img.src;
        const res = await fetch(src, { headers: { Authorization: wcAuth } });
        if (!res.ok) throw new Error(`download ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const rawPath = join(dir, `img-${img.id}`);
        writeFileSync(rawPath, buf);
        // Convert to JPEG via macOS sips (handles avif) for Saleor compatibility.
        const jpgPath = join(dir, `img-${img.id}.jpg`);
        execFileSync("sips", ["-s", "format", "jpeg", rawPath, "--out", jpgPath], { stdio: "ignore" });
        await uploadMedia(prod.id, jpgPath, img.alt || p.name);
        uploaded++;
      } catch (e) {
        fail++;
        console.error(`  ✗ img ${p.id}/${img.id}: ${e.message}`);
      }
    }
    console.log(`  ✓ ${p.id} ${slug} images`);
  }
  console.log(`images: ${uploaded} uploaded, ${skipped} skipped, ${fail} failed`);
}

// productMediaCreate via GraphQL multipart upload spec
async function uploadMedia(productId, filePath, alt) {
  const query = `mutation($product:ID!,$image:Upload!,$alt:String){productMediaCreate(input:{product:$product,image:$image,alt:$alt}){media{id} errors{field message}}}`;
  const operations = JSON.stringify({ query, variables: { product: productId, image: null, alt: alt.slice(0, 250) } });
  const map = JSON.stringify({ "0": ["variables.image"] });
  const fileBuf = readFileSync(filePath);
  const form = new FormData();
  form.append("operations", operations);
  form.append("map", map);
  form.append("0", new Blob([fileBuf], { type: "image/jpeg" }), "image.jpg");
  const res = await fetch(CFG.saleorUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${SALEOR_TOKEN}` },
    body: form,
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  const errs = json.data?.productMediaCreate?.errors;
  if (errs?.length) throw new Error(JSON.stringify(errs));
  return json.data?.productMediaCreate?.media?.id;
}

async function assignMediaToVariant(variantId, mediaId) {
  const r = await gql(
    `mutation($v:ID!,$m:ID!){variantMediaAssign(variantId:$v,mediaId:$m){errors{field message}}}`,
    { v: variantId, m: mediaId }
  );
  const errs = r?.variantMediaAssign?.errors;
  if (errs?.length) throw new Error(JSON.stringify(errs));
}

async function deleteProductMedia(mediaId) {
  const r = await gql(
    `mutation($id:ID!){ productMediaDelete(id:$id){ errors{field message} } }`,
    { id: mediaId }
  );
  const errs = r?.productMediaDelete?.errors;
  if (errs?.length) throw new Error(JSON.stringify(errs));
}

// ---------- stage: variant-images ----------
async function stageVariantImages() {
  let products = await fetchAllWcProducts();
  if (ONLY) products = products.filter((p) => String(p.id) === String(ONLY));
  products = products.filter((p) => p.type === "variable").slice(0, LIMIT);
  const dir = mkdtempSync(join(tmpdir(), "woo-var-img-"));
  let assigned = 0, skipped = 0, fail = 0;

  for (const p of products) {
    const slug = productSlug(p);
    const prod = await findProductBySlug(slug);
    if (!prod) { skipped++; continue; }

    const { data: variations } = await wc(`products/${p.id}/variations?per_page=100`);
    for (const v of variations) {
      if (!v.image?.src) { skipped++; continue; }
      const sku = v.sku || `DM-${p.id}-${v.id}`;
      const variant = await findVariantBySku(sku);
      if (!variant) { skipped++; continue; }

      // Skip if variant already has media assigned
      const varData = await gql(`query($id:ID!){productVariant(id:$id){media{id}}}`, { id: variant.id });
      if (varData.productVariant?.media?.length) { skipped++; continue; }

      try {
        const res = await fetch(v.image.src, { headers: { Authorization: wcAuth } });
        if (!res.ok) throw new Error(`download ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const rawPath = join(dir, `var-${p.id}-${v.id}`);
        writeFileSync(rawPath, buf);
        const jpgPath = join(dir, `var-${p.id}-${v.id}.jpg`);
        execFileSync("sips", ["-s", "format", "jpeg", rawPath, "--out", jpgPath], { stdio: "ignore" });
        const mediaId = await uploadMedia(prod.id, jpgPath, v.image.alt || p.name);
        if (mediaId) {
          await assignMediaToVariant(variant.id, mediaId);
          assigned++;
          console.log(`  ✓ ${sku} variant image assigned`);
        }
      } catch (e) {
        fail++;
        console.error(`  ✗ ${p.id}/${v.id} ${sku}: ${e.message}`);
      }
    }
  }
  console.log(`variant-images: ${assigned} assigned, ${skipped} skipped, ${fail} failed`);
}

// ---------- stage: local-images ----------
// Reads from LOCAL_IMAGES_DIR (default: ../../product images relative to this script).
// Each sub-folder is one product; filename suffix before extension indicates color variant.
// Main image: dennis-muraguri-{slug}-matatu-art-print.{ext}
// Color image: dennis-muraguri-{slug}-matatu-art-print-{color}.{ext}
async function findVariantByColor(productId, color) {
  const data = await gql(
    `query($id:ID!){product(id:$id){variants{id attributes{attribute{slug}values{name}}}}}`,
    { id: productId }
  );
  return data.product?.variants?.find((v) =>
    v.attributes.some(
      (a) =>
        a.attribute.slug === "color" &&
        a.values.some((val) => val.name.toLowerCase() === color.toLowerCase())
    )
  );
}

// Folder name → Saleor slug overrides (for products whose WC slug differs from the folder name).
const LOCAL_IMAGES_SLUG_OVERRIDES = {
  "Bash II - Kacose Sacco": "bash-2-kacose-sacco",
  "Dont Shoot ROG Sacco": "don-t-shoot-4041",
  "Malcolm X - Ngong Sacco": "malcom-x-ngong-matatu-oa-4048",
  "Minion - Ebet Sacco": "minion-ebet-sacco-4046",
  "Pig Society - Taifa Sacco": "pig-society-rog-sacco-4047",
  "Tractor and Matatu": "matatu-and-tractor",
  "Warembo Bila Make-up": "warembo-bila-make-up-4051",
};

async function stageLocalImages() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const imagesRoot = process.env.LOCAL_IMAGES_DIR || join(scriptDir, "../../product images");
  const folders = readdirSync(imagesRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const tmpDir = mkdtempSync(join(tmpdir(), "local-img-"));
  let uploaded = 0, assigned = 0, skipped = 0, fail = 0;

  for (const folder of folders) {
    const slug = LOCAL_IMAGES_SLUG_OVERRIDES[folder]
      ?? folder.toLowerCase().replace(/\s*-\s*/g, "-").replace(/\s+/g, "-");
    const prod = await findProductBySlug(slug);
    if (!prod) {
      console.warn(`  ✗ no Saleor product for slug "${slug}" (folder: ${folder})`);
      skipped++;
      continue;
    }

    // Skip if already has media
    const existing = await gql(`query($id:ID!){product(id:$id){media{id}}}`, { id: prod.id });
    if (existing.product?.media?.length) {
      console.log(`  ↷ ${slug} already has media, skipping`);
      skipped++;
      continue;
    }

    const folderPath = join(imagesRoot, folder);
    const files = readdirSync(folderPath).filter((f) => /\.(jpg|jpeg|webp|png|avif)$/i.test(f));

    // Split main image vs color variants by checking suffix before extension
    const mainFiles = files.filter((f) => {
      const base = basename(f, extname(f));
      return base.endsWith("-matatu-art-print") || base.endsWith("-print");
    });
    const colorFiles = files.filter((f) => !mainFiles.includes(f));

    // Upload main image first
    for (const file of mainFiles) {
      try {
        const src = join(folderPath, file);
        const jpgPath = join(tmpDir, `${slug}-main.jpg`);
        execFileSync("sips", ["-s", "format", "jpeg", src, "--out", jpgPath], { stdio: "ignore" });
        await uploadMedia(prod.id, jpgPath, `${folder} matatu art print by Dennis Muraguri`);
        uploaded++;
      } catch (e) {
        fail++;
        console.error(`  ✗ ${slug} main: ${e.message}`);
      }
    }

    // Upload color variant images and assign to matching variants
    for (const file of colorFiles) {
      const base = basename(file, extname(file));
      // Extract color: last segment after "-matatu-art-print-"
      const match = base.match(/-matatu-art-print-(.+)$/);
      const color = match ? match[1] : null;
      try {
        const src = join(folderPath, file);
        const jpgPath = join(tmpDir, `${slug}-${color || "variant"}.jpg`);
        execFileSync("sips", ["-s", "format", "jpeg", src, "--out", jpgPath], { stdio: "ignore" });
        const mediaId = await uploadMedia(prod.id, jpgPath, `${folder} ${color || ""} matatu art print by Dennis Muraguri`.trim());
        uploaded++;
        if (color && mediaId) {
          const variant = await findVariantByColor(prod.id, color);
          if (variant) {
            await assignMediaToVariant(variant.id, mediaId);
            assigned++;
          } else {
            console.warn(`  ⚠ ${slug}: no variant for color "${color}"`);
          }
        }
      } catch (e) {
        fail++;
        console.error(`  ✗ ${slug}/${color}: ${e.message}`);
      }
    }

    console.log(`  ✓ ${slug}: ${mainFiles.length} main + ${colorFiles.length} color images`);
  }
  console.log(`local-images: ${uploaded} uploaded, ${assigned} variant-assigned, ${skipped} skipped, ${fail} failed`);
}

// ---------- stage: create-local-products ----------
// Creates products that have no WooCommerce equivalent (client-supplied images only).
// Hardcoded: Chicago Bulls - Expresso Sacco, Salt n Peppa - Expresso Sacco.
const LOCAL_PRODUCTS = [
  {
    name: "Chicago Bulls - Expresso Sacco",
    slug: "chicago-bulls-expresso-sacco",
    category: "expresso-sacco",
    colors: ["blue", "red"],
  },
  {
    name: "Salt n Peppa - Expresso Sacco",
    slug: "salt-n-peppa-expresso-sacco",
    category: "expresso-sacco",
    colors: ["blue", "green", "pink", "red"],
  },
];

async function stageCreateLocalProducts() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const imagesRoot = process.env.LOCAL_IMAGES_DIR || join(scriptDir, "../../product images");
  const tmpDir = mkdtempSync(join(tmpdir(), "local-prod-"));

  for (const p of LOCAL_PRODUCTS) {
    const cat = await findCategory(p.category);
    const existing = await findProductBySlug(p.slug);

    let productId;
    if (existing) {
      console.log(`  ↷ ${p.slug} already exists (id ${existing.id}), skipping create`);
      productId = existing.id;
    } else {
      const input = {
        name: p.name,
        slug: p.slug,
        productType: ctx.variableTypeId,
        ...(cat ? { category: cat.id } : {}),
        description: richText(`<p>Shop ${p.name} — a high quality reproduction of matatu art.</p>`),
        seo: {
          title: `Buy ${p.name} | Dennis Muraguri Art Prints`,
          description: `Shop ${p.name} — a high quality reproduction of Expresso Sacco matatu art.`,
        },
      };
      const d = await gql(
        `mutation($in:ProductCreateInput!){productCreate(input:$in){product{id} errors{field message}}}`,
        { in: input }
      );
      if (!d.productCreate.product) throw new Error("create " + p.slug + ": " + JSON.stringify(d.productCreate.errors));
      productId = d.productCreate.product.id;
      console.log(`  ✓ created ${p.slug}`);
    }

    // Publish
    await gql(
      `mutation($id:ID!,$in:ProductChannelListingUpdateInput!){productChannelListingUpdate(id:$id,input:$in){errors{field message}}}`,
      { id: productId, in: { updateChannels: [{ channelId: ctx.channelId, isPublished: true, visibleInListings: true, isAvailableForPurchase: true }] } }
    );

    // Color variants
    for (const color of p.colors) {
      const sku = `DM-${p.slug}-${color}`;
      await upsertVariant(productId, sku, "50", color);
    }

    // Upload images from local folder and assign to variants
    const folderName = Object.entries(LOCAL_IMAGES_SLUG_OVERRIDES).find(([, v]) => v === p.slug)?.[0] ?? p.name;
    const folderPath = join(imagesRoot, folderName);
    let files;
    try {
      files = readdirSync(folderPath).filter((f) => /\.(jpg|jpeg|webp|png|avif)$/i.test(f));
    } catch {
      console.warn(`  ⚠ no image folder found for ${p.name} (looked for: ${folderPath})`);
      continue;
    }

    // Check if product already has media
    const existing2 = await gql(`query($id:ID!){product(id:$id){media{id}}}`, { id: productId });
    if (existing2.product?.media?.length) {
      console.log(`  ↷ ${p.slug} already has media, skipping image upload`);
      continue;
    }

    for (const file of files) {
      const base = basename(file, extname(file));
      const match = base.match(/-matatu-art-print-(.+)$/);
      const color = match ? match[1] : null;
      try {
        const src = join(folderPath, file);
        const jpgPath = join(tmpDir, `${p.slug}-${color || "main"}.jpg`);
        execFileSync("sips", ["-s", "format", "jpeg", src, "--out", jpgPath], { stdio: "ignore" });
        const mediaId = await uploadMedia(productId, jpgPath, `${p.name} ${color || ""} matatu art print by Dennis Muraguri`.trim());
        if (color && mediaId) {
          const variant = await findVariantByColor(productId, color);
          if (variant) {
            await assignMediaToVariant(variant.id, mediaId);
            console.log(`    ✓ ${color} image assigned to variant`);
          }
        }
      } catch (e) {
        console.error(`  ✗ ${p.slug}/${color}: ${e.message}`);
      }
    }
    console.log(`  ✓ ${p.slug} done`);
  }
}

// ---------- stage: publish-drafts ----------
async function stagePublishDrafts() {
  // Fetch all products (published + unpublished) via admin API
  const data = await gql(
    `query{products(first:100,channel:${JSON.stringify(CFG.channel)}){edges{node{id slug isAvailable}}}}`,
    {}
  );
  const all = data.products?.edges || [];
  const drafts = all.filter((e) => !e.node.isAvailable);
  console.log(`publishing ${drafts.length} drafts (${all.length} total)...`);
  let ok = 0, fail = 0;
  for (const { node } of drafts) {
    try {
      await gql(
        `mutation($id:ID!,$in:ProductChannelListingUpdateInput!){productChannelListingUpdate(id:$id,input:$in){errors{field message}}}`,
        { id: node.id, in: { updateChannels: [{ channelId: ctx.channelId, isPublished: true, visibleInListings: true, isAvailableForPurchase: true }] } }
      );
      ok++;
      console.log(`  ✓ ${node.slug}`);
    } catch (e) {
      fail++;
      console.error(`  ✗ ${node.slug}: ${e.message}`);
    }
  }
  console.log(`publish-drafts: ${ok} published, ${fail} failed`);
}

// Deletes and recreates a product as VARIABLE_TYPE, preserving name/slug/description/SEO/category.
// Media is lost on delete — caller re-uploads via local files.
async function convertToVariableType(productId) {
  const d = await gql(
    `query($id:ID!){product(id:$id){name slug description seoTitle seoDescription category{id} metadata{key value}}}`,
    { id: productId }
  );
  const p = d.product;
  await gql(`mutation($id:ID!){productDelete(id:$id){errors{message}}}`, { id: productId });
  const c = await gql(
    `mutation($in:ProductCreateInput!){productCreate(input:$in){product{id} errors{field message}}}`,
    { in: {
      name: p.name, slug: p.slug, productType: ctx.variableTypeId,
      ...(p.category ? { category: p.category.id } : {}),
      description: p.description,
      seo: { title: p.seoTitle, description: p.seoDescription },
      metadata: p.metadata,
    } }
  );
  if (!c.productCreate.product) throw new Error("recreate failed: " + JSON.stringify(c.productCreate.errors));
  const newId = c.productCreate.product.id;
  await gql(
    `mutation($id:ID!,$in:ProductChannelListingUpdateInput!){productChannelListingUpdate(id:$id,input:$in){errors{field message}}}`,
    { id: newId, in: { updateChannels: [{ channelId: ctx.channelId, isPublished: true, visibleInListings: true, isAvailableForPurchase: true }] } }
  );
  return newId;
}

// ---------- stage: local-assign-swatches ----------
// For local-image products: parse colors from filenames, create color variants if
// missing, then assign existing Saleor media (already uploaded by local-images stage)
// to each variant. Re-uploads if matching media not found by alt text.
const NON_COLOR_SUFFIXES = new Set(["feat-image"]);

function colorFromAlt(alt, folder) {
  // alt: "{folder} {color} matatu art print by Dennis Muraguri"
  const prefix = folder.toLowerCase() + " ";
  const lower = alt.toLowerCase();
  if (!lower.startsWith(prefix)) return null;
  const rest = lower.slice(prefix.length);
  const end = rest.indexOf(" matatu art print");
  return end > 0 ? rest.slice(0, end).trim() : null;
}

async function stageLocalAssignSwatches() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const imagesRoot = process.env.LOCAL_IMAGES_DIR || join(scriptDir, "../../product images");
  const folders = readdirSync(imagesRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const tmpDir = mkdtempSync(join(tmpdir(), "swatch-"));
  let created = 0, assigned = 0, skipped = 0, fail = 0;

  for (const folder of folders) {
    const slug = LOCAL_IMAGES_SLUG_OVERRIDES[folder]
      ?? folder.toLowerCase().replace(/\s*-\s*/g, "-").replace(/\s+/g, "-");
    const prod = await findProductBySlug(slug);
    if (!prod) { console.warn(`  ✗ no product for "${slug}"`); skipped++; continue; }

    const folderPath = join(imagesRoot, folder);
    const files = readdirSync(folderPath).filter((f) => /\.(jpg|jpeg|webp|png|avif|gif)$/i.test(f));

    // Parse color → file pairs from filenames
    const colorFiles = [];
    for (const file of files) {
      const base = basename(file, extname(file));
      const match = base.match(/-matatu-art-print-(.+)$/);
      if (!match) continue;
      const color = match[1];
      if (NON_COLOR_SUFFIXES.has(color)) continue;
      colorFiles.push({ file, color });
    }
    if (colorFiles.length === 0) { skipped++; continue; }

    // Ensure product is VARIABLE_TYPE (has Color as variant attribute)
    const typeCheck = await gql(`query($id:ID!){product(id:$id){productType{id}}}`, { id: prod.id });
    if (typeCheck.product?.productType?.id !== ctx.variableTypeId) {
      console.log(`  ↻ ${slug}: wrong product type, converting to variable...`);
      prod.id = await convertToVariableType(prod.id);
      console.log(`  ✓ ${slug}: converted, new id ${prod.id}`);
    }

    // Fetch current product media and variants in one call
    const prodData = await gql(
      `query($id:ID!){product(id:$id){media{id alt} variants{id sku attributes{attribute{slug}values{name}} media{id}}}}`,
      { id: prod.id }
    );
    const media = prodData.product?.media || [];
    const variants = prodData.product?.variants || [];

    for (const { file, color } of colorFiles) {
      try {
        await ensureColorValue(color);

        // Find existing color variant in already-fetched list
        let variant = variants.find((v) =>
          v.attributes.some(
            (a) => a.attribute.slug === "color" && a.values.some((val) => val.name.toLowerCase() === color.toLowerCase())
          )
        );
        if (!variant) {
          const sku = `DM-${slug}-${color}`;
          const varId = await upsertVariant(prod.id, sku, "50", color);
          variant = { id: varId, media: [] };
          created++;
          console.log(`    + ${slug}/${color} variant created`);
        }

        if (variant.media?.length) { skipped++; continue; } // already assigned

        // Match existing product media by alt text
        let mediaId = media.find((m) => colorFromAlt(m.alt, folder) === color.toLowerCase())?.id;

        if (!mediaId) {
          // Re-upload (media missing or alt doesn't match)
          const src = join(folderPath, file);
          const jpgPath = join(tmpDir, `${slug}-${color}.jpg`);
          execFileSync("sips", ["-s", "format", "jpeg", src, "--out", jpgPath], { stdio: "ignore" });
          mediaId = await uploadMedia(prod.id, jpgPath, `${folder} ${color} matatu art print by Dennis Muraguri`);
        }

        if (mediaId) {
          await assignMediaToVariant(variant.id, mediaId);
          assigned++;
          console.log(`    ✓ ${slug}/${color} assigned`);
        }
      } catch (e) {
        fail++;
        console.error(`    ✗ ${slug}/${color}: ${e.message}`);
      }
    }
    console.log(`  ✓ ${slug}: ${colorFiles.length} colors processed`);
  }
  console.log(`local-assign-swatches: ${created} variants created, ${assigned} assigned, ${skipped} skipped, ${fail} failed`);
}

// ---------- stage: add-these ----------
// Uploads images from the "add these" folder in the project root.
// Folder names map to Saleor products via normalized name or FOLDER_OVERRIDES slug.
// Run with --dry-run to preview without uploading.
const ADD_THESE_DIR = process.env.ADD_THESE_DIR
  || join(dirname(fileURLToPath(import.meta.url)), "../../add these");

// Stale folder names → correct Saleor product slugs
const FOLDER_OVERRIDES = {
  "Beat Port Front - Ongata Line Transporters": "beat-port-ongata-line-transporters-4062",
  "Ferrari - Umoinner Sacco": "ferrari-umo-inner-sacco-4065",
  "TMT (The Money Team) - Umoinner Sacco": "the-money-team-umo-inner-sacco-4053",
};

const normalizeName = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function getAllProducts() {
  const d = await gql(`{
    products(first:100, channel:"${CFG.channel}") {
      edges { node { id name slug media { id } } }
    }
  }`);
  return d.products.edges.map((e) => e.node);
}

async function stageAddThese() {
  const dryRun = args.includes("--dry-run");
  if (dryRun) console.log("  [dry-run mode — no uploads]");

  const allProducts = await getAllProducts();
  const byNorm = new Map(allProducts.map((p) => [normalizeName(p.name), p]));
  const bySlug = new Map(allProducts.map((p) => [p.slug, p]));

  const tmpDir = dryRun ? null : mkdtempSync(join(tmpdir(), "add-these-"));
  const IMAGE_EXTS = /\.(jpg|jpeg|webp|png|avif|gif)$/i;
  let uploaded = 0, skipped = 0, missing = 0;

  const topFolders = readdirSync(ADD_THESE_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const folder of topFolders) {
    if (folder === "Beba") continue; // handled separately below

    // Resolve product
    const overrideSlug = FOLDER_OVERRIDES[folder];
    const prod = overrideSlug ? bySlug.get(overrideSlug) : byNorm.get(normalizeName(folder));
    if (!prod) {
      console.warn(`  ⚠ no Saleor match for folder "${folder}"`);
      missing++;
      continue;
    }

    // Collect direct image files (skip subdirs and .DS_Store)
    const folderPath = join(ADD_THESE_DIR, folder);
    const images = readdirSync(folderPath, { withFileTypes: true })
      .filter((f) => f.isFile() && IMAGE_EXTS.test(f.name))
      .map((f) => f.name);

    if (!images.length) {
      console.log(`  ⏭ ${prod.name} — no images yet`);
      skipped++;
      continue;
    }

    if (prod.media?.length) {
      console.log(`  ↷ ${prod.name} — already has media, skipping`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  would upload ${images.length} image(s) → ${prod.name}`);
      uploaded += images.length;
      continue;
    }

    for (const file of images) {
      const src = join(folderPath, file);
      const jpgPath = join(tmpDir, `${prod.slug}-${file}.jpg`);
      execFileSync("sips", ["-s", "format", "jpeg", src, "--out", jpgPath], { stdio: "ignore" });
      await uploadMedia(prod.id, jpgPath, `${prod.name} matatu art print by Dennis Muraguri`);
      uploaded++;
    }
    console.log(`  ✅ uploaded ${images.length} image(s) → ${prod.name}`);
  }

  // Beba special case: one image → all Beba products without media
  const bebaImagePath = join(ADD_THESE_DIR, "Beba", "beba-bei.png");
  let bebaFile;
  try { bebaFile = readFileSync(bebaImagePath); } catch { bebaFile = null; }

  if (bebaFile) {
    const bebaProducts = allProducts.filter(
      (p) => normalizeName(p.name).startsWith("beba") && !p.media?.length
    );
    if (dryRun) {
      console.log(`  would upload beba-bei.png → ${bebaProducts.length} Beba product(s)`);
    } else {
      const jpgPath = join(tmpDir, "beba-bei.jpg");
      execFileSync("sips", ["-s", "format", "jpeg", bebaImagePath, "--out", jpgPath], { stdio: "ignore" });
      for (const p of bebaProducts) {
        await uploadMedia(p.id, jpgPath, `${p.name} matatu art print by Dennis Muraguri`);
        console.log(`  ✅ beba-bei.png → ${p.name}`);
        uploaded++;
      }
    }
  } else {
    console.log("  ⏭ Beba/beba-bei.png not found, skipping Beba products");
  }

  console.log(`add-these: ${uploaded} uploaded, ${skipped} skipped/existing, ${missing} unmatched folders`);
}

// ---------- stage: add-these-swatches ----------
// For products in "add these/" with named-colour image files (e.g. -matatu-art-print-blue.webp):
// deletes existing product media (uploaded without colour info by add-these), re-uploads each
// image with colour in the alt text, creates the colour variant, and assigns the media.
// Also handles Beba/ subfolders, each of which maps to its own Saleor product.
async function stageAddTheseSwatches() {
  const allProducts = await getAllProducts();
  const byNorm = new Map(allProducts.map((p) => [normalizeName(p.name), p]));
  const bySlug = new Map(allProducts.map((p) => [p.slug, p]));

  const tmpDir = mkdtempSync(join(tmpdir(), "add-swatches-"));
  const IMAGE_EXTS = /\.(jpg|jpeg|webp|png|avif|gif)$/i;
  let created = 0, assigned = 0, skipped = 0, fail = 0;

  // Build list of {folder, folderPath, prod} entries:
  // top-level (excluding Beba/) + Beba/* subfolders
  const entries = [];
  for (const d of readdirSync(ADD_THESE_DIR, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    if (d.name === "Beba") {
      // Each subfolder of Beba/ is its own product
      const bebaPath = join(ADD_THESE_DIR, "Beba");
      for (const sub of readdirSync(bebaPath, { withFileTypes: true })) {
        if (sub.isDirectory()) entries.push({ folder: sub.name, folderPath: join(bebaPath, sub.name), useOverrides: false });
      }
    } else {
      entries.push({ folder: d.name, folderPath: join(ADD_THESE_DIR, d.name), useOverrides: true });
    }
  }

  for (const { folder, folderPath, useOverrides } of entries) {
    const files = readdirSync(folderPath, { withFileTypes: true })
      .filter((f) => f.isFile() && IMAGE_EXTS.test(f.name))
      .map((f) => f.name);

    const colorFiles = [];
    for (const file of files) {
      const base = basename(file, extname(file));
      const match = base.match(/-matatu-art-print-(.+)$/);
      if (!match) continue;
      const color = match[1];
      if (/^\d+$/.test(color)) continue;
      colorFiles.push({ file, color });
    }

    if (colorFiles.length === 0) { skipped++; continue; }

    const overrideSlug = useOverrides ? FOLDER_OVERRIDES[folder] : null;
    const prod = overrideSlug ? bySlug.get(overrideSlug) : byNorm.get(normalizeName(folder));
    if (!prod) {
      console.warn(`  ⚠ no Saleor match for folder "${folder}"`);
      skipped++;
      continue;
    }
    console.log(`  ${prod.name}: ${colorFiles.length} colour variant(s)`);

    const prodData = await gql(
      `query($id:ID!){product(id:$id){media{id alt} variants{id sku attributes{attribute{slug}values{name}} media{id}} productType{id}}}`,
      { id: prod.id }
    );
    let media = prodData.product?.media || [];
    let variants = prodData.product?.variants || [];

    if (prodData.product?.productType?.id !== ctx.variableTypeId) {
      console.log(`    ↻ converting to variable type...`);
      prod.id = await convertToVariableType(prod.id);
      media = [];
      variants = [];
    }

    for (const m of media) {
      await deleteProductMedia(m.id);
      console.log(`    🗑 deleted old media`);
    }

    for (const { file, color } of colorFiles) {
      try {
        await ensureColorValue(color);

        let variantId;
        const existing = variants.find((v) =>
          v.attributes.some(
            (a) => a.attribute.slug === "color" && a.values.some((val) => val.name.toLowerCase() === color.toLowerCase())
          )
        );
        if (!existing) {
          variantId = await upsertVariant(prod.id, `DM-${prod.slug}-${color}`, "50", color);
          created++;
          console.log(`    + variant: ${color}`);
        } else {
          variantId = existing.id;
        }

        const src = join(folderPath, file);
        const jpgPath = join(tmpDir, `${prod.slug}-${color}.jpg`);
        execFileSync("sips", ["-s", "format", "jpeg", src, "--out", jpgPath], { stdio: "ignore" });
        const mediaId = await uploadMedia(prod.id, jpgPath, `${folder} ${color} matatu art print by Dennis Muraguri`);
        await assignMediaToVariant(variantId, mediaId);
        assigned++;
        console.log(`    ✓ ${color} assigned`);
      } catch (e) {
        fail++;
        console.error(`    ✗ ${folder}/${color}: ${e.message}`);
      }
    }
  }

  console.log(`add-these-swatches: ${created} variants created, ${assigned} assigned, ${skipped} skipped, ${fail} failed`);
}

// ---------- stage: delete-test-products ----------
const TEST_PRODUCT_NAMES = (process.env.TEST_PRODUCT_NAMES || "nini").split(",").map((s) => s.trim());

async function stageDeleteTestProducts() {
  const allProducts = await getAllProducts();
  const targets = allProducts.filter((p) => TEST_PRODUCT_NAMES.includes(p.name));
  if (!targets.length) { console.log("  no test products found"); return; }
  for (const p of targets) {
    const d = await gql(
      `mutation($id:ID!){productDelete(id:$id){product{id name} errors{field message}}}`,
      { id: p.id }
    );
    if (d.productDelete.errors?.length) {
      console.error(`  ✗ failed to delete ${p.name}: ${JSON.stringify(d.productDelete.errors)}`);
    } else {
      console.log(`  ✅ deleted "${p.name}" (${p.id})`);
    }
  }
}

// ---------- main ----------
const stage = process.argv[2];
(async () => {
  await saleorLogin();
  await loadContext();
  if (["setup", "products", "images", "create-local-products", "local-assign-swatches", "add-these-swatches", "all"].includes(stage)) await stageSetup();
  if (stage === "setup") { /* done */ }
  else if (stage === "categories" || stage === "all") await stageCategories();
  if (stage === "products" || stage === "all") await stageProducts();
  if (stage === "images" || stage === "all") await stageImages();
  if (stage === "variant-images") await stageVariantImages();
  if (stage === "local-images") await stageLocalImages();
  if (stage === "create-local-products") await stageCreateLocalProducts();
  if (stage === "publish-drafts") await stagePublishDrafts();
  if (stage === "local-assign-swatches") await stageLocalAssignSwatches();
  if (stage === "add-these") await stageAddThese();
  if (stage === "add-these-swatches") await stageAddTheseSwatches();
  if (stage === "delete-test-products") await stageDeleteTestProducts();
  if (!["setup", "categories", "products", "images", "variant-images", "local-images", "create-local-products", "publish-drafts", "local-assign-swatches", "add-these", "add-these-swatches", "delete-test-products", "all"].includes(stage)) {
    console.error("Usage: node scripts/migrate-woo-to-saleor.mjs <setup|categories|products|images|variant-images|local-images|create-local-products|publish-drafts|local-assign-swatches|add-these|add-these-swatches|delete-test-products|all> [--limit N] [--status any] [--only wooId]");
    process.exit(1);
  }
  console.log("done.");
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
