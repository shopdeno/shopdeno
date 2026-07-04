#!/usr/bin/env node
// Saleor -> Saleor catalog mirror (LOCAL localhost:8000 -> Saleor Cloud).
//
// The WooCommerce source is gone, so the freshest real catalog lives only in the
// local Saleor Docker. This copies it to Cloud, which currently still holds Saleor
// demo data. READ-ONLY against the source; every write/delete targets DST (Cloud).
//
// Stages (run in order):
//   purge      - delete ALL products (every channel) + ALL categories on DST (wipes demo data)
//   setup      - ensure Color SWATCH attribute + product types on DST
//   categories - mirror SRC categories -> DST
//   products   - mirror SRC products + variants + price + stock + publish -> DST
//   images     - mirror SRC product media (in order, with alt) -> DST
//   verify     - print DST product count in the channel
//   all        - setup, categories, products, images, verify (NOT purge — run that explicitly)
//
// Env:
//   SRC_URL   (default http://localhost:8000/graphql/)
//   SRC_EMAIL SRC_PASSWORD (default admin@example.com / admin)
//   DST_URL   (default https://store-drwvfcof.eu.saleor.cloud/graphql/)
//   DST_TOKEN (REQUIRED — Cloud staff token w/ MANAGE_PRODUCTS + MANAGE_PRODUCT_TYPES_AND_ATTRIBUTES)
//   CHANNEL   (default default-channel)   [--limit N] [--only <slug>]

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CFG = {
  srcUrl: process.env.SRC_URL || "http://localhost:8000/graphql/",
  srcEmail: process.env.SRC_EMAIL || "admin@example.com",
  srcPassword: process.env.SRC_PASSWORD || "admin",
  dstUrl: process.env.DST_URL || "https://store-drwvfcof.eu.saleor.cloud/graphql/",
  dstToken: process.env.DST_TOKEN || "",
  channel: process.env.CHANNEL || "default-channel",
};

const SIMPLE_TYPE = "Matatu Art Print";
const VARIABLE_TYPE = "Matatu Art Print (Color)";
const COLOR_ATTR = "Color";

const COLOR_HEX = {
  red: "#dc2626", blue: "#2563eb", green: "#16a34a", black: "#111827",
  white: "#f9fafb", yellow: "#ca8a04", orange: "#ea580c", purple: "#9333ea",
  pink: "#ec4899", brown: "#92400e", gray: "#6b7280", grey: "#6b7280",
  silver: "#9ca3af", gold: "#d97706", navy: "#1e3a8a", teal: "#0d9488",
  maroon: "#9f1239", olive: "#65a30d", cyan: "#0891b2", magenta: "#c026d3",
  lime: "#84cc16", coral: "#f97316", violet: "#7c3aed", indigo: "#4f46e5",
  beige: "#d4b896", cream: "#fef9c3", turquoise: "#14b8a6",
  burgundy: "#9f1239", "light-blue": "#93c5fd", "light-burgundy": "#c4827a",
  ornage: "#ea580c",
};
const colorToHex = (n) => (!n ? "#9ca3af" : COLOR_HEX[n.toLowerCase().trim()] ?? "#9ca3af");
const slugify = (s) => (s || "").toString().toLowerCase().trim()
  .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// ---------- HTTP ----------
let SRC_TOKEN = null;
async function gqlSrc(query, variables = {}) {
  const res = await fetch(CFG.srcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(SRC_TOKEN ? { Authorization: `Bearer ${SRC_TOKEN}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error("SRC GQL: " + JSON.stringify(json.errors));
  return json.data;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Serialize + pace DST calls to stay under Saleor Cloud free-tier throttling.
const PACE_MS = Number(process.env.PACE_MS || 120);
let _gate = Promise.resolve();
function paced() {
  const p = _gate.then(() => sleep(PACE_MS));
  _gate = p;
  return p;
}
async function gqlDst(query, variables = {}, attempt = 0) {
  await paced();
  let res, json;
  try {
    res = await fetch(CFG.dstUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${CFG.dstToken}` },
      body: JSON.stringify({ query, variables }),
    });
  } catch (e) {
    if (attempt < 5) { await sleep(500 * 2 ** attempt); return gqlDst(query, variables, attempt + 1); }
    throw e;
  }
  // Retry throttling / transient server errors with backoff.
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    await sleep(500 * 2 ** attempt); return gqlDst(query, variables, attempt + 1);
  }
  try { json = await res.json(); }
  catch (e) { if (attempt < 5) { await sleep(500 * 2 ** attempt); return gqlDst(query, variables, attempt + 1); } throw new Error(`DST non-JSON ${res.status}`); }
  if (json.errors) {
    const rate = json.errors.some((e) => /rate|throttl|too many/i.test(e.message || ""));
    if (rate && attempt < 5) { await sleep(500 * 2 ** attempt); return gqlDst(query, variables, attempt + 1); }
    throw new Error("DST GQL: " + JSON.stringify(json.errors));
  }
  if (json.data == null && attempt < 5) { await sleep(500 * 2 ** attempt); return gqlDst(query, variables, attempt + 1); }
  return json.data;
}
async function srcLogin() {
  const d = await gqlSrc(`mutation($e:String!,$p:String!){tokenCreate(email:$e,password:$p){token errors{message}}}`,
    { e: CFG.srcEmail, p: CFG.srcPassword });
  if (!d.tokenCreate.token) throw new Error("SRC login failed: " + JSON.stringify(d.tokenCreate.errors));
  SRC_TOKEN = d.tokenCreate.token;
}

// ---------- args ----------
const args = process.argv.slice(3);
const flag = (n, def = null) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : def; };
const LIMIT = flag("limit") ? Number(flag("limit")) : Infinity;
const ONLY = flag("only");

// ---------- DST context ----------
const ctx = {};
async function loadDstContext() {
  const d = await gqlDst(`{ channels{ id slug } warehouses(first:20){ edges{ node{ id name shippingZones(first:5){ edges{ node{ channels{ slug } } } } } } } }`);
  ctx.channelId = d.channels.find((c) => c.slug === CFG.channel)?.id;
  if (!ctx.channelId) throw new Error(`DST channel ${CFG.channel} not found`);
  // Pick a warehouse whose shipping zone serves this channel; prefer "Default Warehouse".
  const inChannel = d.warehouses.edges.filter((w) =>
    w.node.shippingZones.edges.some((z) => z.node.channels.some((c) => c.slug === CFG.channel)));
  const pick = inChannel.find((w) => w.node.name === "Default Warehouse") || inChannel[0] || d.warehouses.edges[0];
  ctx.warehouseId = pick?.node?.id;
  if (!ctx.warehouseId) throw new Error("DST has no warehouse");
  console.log(`  DST warehouse: ${pick.node.name}`);
}

// ---------- DST lookups ----------
async function dstFindAttribute(slug) {
  const d = await gqlDst(`query($s:[String!]){attributes(first:1,where:{slug:{oneOf:$s}}){edges{node{id slug}}}}`, { s: [slug] });
  return d.attributes.edges[0]?.node || null;
}
async function dstFindProductType(name) {
  const d = await gqlDst(`query($q:String){productTypes(first:10,filter:{search:$q}){edges{node{id name}}}}`, { q: name });
  return d.productTypes.edges.find((e) => e.node.name === name)?.node || null;
}
async function dstFindCategory(slug) {
  const d = await gqlDst(`query($s:String){category(slug:$s){id slug}}`, { s: slug });
  return d.category;
}
async function dstFindProductBySlug(slug) {
  const d = await gqlDst(`query($s:String){product(slug:$s){id slug}}`, { s: slug });
  return d.product;
}
async function dstFindVariantBySku(sku) {
  const d = await gqlDst(`query($s:String){productVariant(sku:$s){id sku}}`, { s: sku });
  return d.productVariant;
}

// ---------- stage: setup ----------
async function stageSetup() {
  let color = await dstFindAttribute(slugify(COLOR_ATTR));
  if (!color) {
    const d = await gqlDst(`mutation($in:AttributeCreateInput!){attributeCreate(input:$in){attribute{id slug} errors{field message}}}`,
      { in: { name: COLOR_ATTR, slug: slugify(COLOR_ATTR), type: "PRODUCT_TYPE", inputType: "SWATCH" } });
    if (!d.attributeCreate.attribute) throw new Error("attr: " + JSON.stringify(d.attributeCreate.errors));
    color = d.attributeCreate.attribute;
    console.log("  created Color (SWATCH)");
  } else console.log("  Color attribute exists");
  ctx.colorAttrId = color.id;

  let simple = await dstFindProductType(SIMPLE_TYPE);
  if (!simple) {
    const d = await gqlDst(`mutation($in:ProductTypeInput!){productTypeCreate(input:$in){productType{id} errors{field message}}}`,
      { in: { name: SIMPLE_TYPE, slug: slugify(SIMPLE_TYPE), hasVariants: false, isShippingRequired: true } });
    if (!d.productTypeCreate.productType) throw new Error("simple type: " + JSON.stringify(d.productTypeCreate.errors));
    simple = d.productTypeCreate.productType;
    console.log("  created type", SIMPLE_TYPE);
  } else console.log("  type exists", SIMPLE_TYPE);
  ctx.simpleTypeId = simple.id;

  let variable = await dstFindProductType(VARIABLE_TYPE);
  if (!variable) {
    const d = await gqlDst(`mutation($in:ProductTypeInput!){productTypeCreate(input:$in){productType{id} errors{field message}}}`,
      { in: { name: VARIABLE_TYPE, slug: slugify(VARIABLE_TYPE), hasVariants: true, isShippingRequired: true, variantAttributes: [ctx.colorAttrId] } });
    if (!d.productTypeCreate.productType) throw new Error("variable type: " + JSON.stringify(d.productTypeCreate.errors));
    variable = d.productTypeCreate.productType;
    console.log("  created type", VARIABLE_TYPE);
  } else console.log("  type exists", VARIABLE_TYPE);
  ctx.variableTypeId = variable.id;
}

// ---------- stage: purge (DST demo data) ----------
async function dstAllProductIds() {
  const ids = [];
  for (const ch of [CFG.channel, null]) {
    // channel arg required when >1 channel; iterate known channels
  }
  // Products are not channel-scoped for delete; enumerate per channel then dedupe.
  const seen = new Set();
  const channels = await gqlDst(`{channels{slug}}`);
  for (const c of channels.channels) {
    let after = null;
    for (;;) {
      const d = await gqlDst(`query($a:String,$c:String!){products(first:100,after:$a,channel:$c){pageInfo{hasNextPage endCursor} edges{node{id name}}}}`,
        { a: after, c: c.slug });
      for (const e of d.products.edges) if (!seen.has(e.node.id)) { seen.add(e.node.id); ids.push(e.node); }
      if (!d.products.pageInfo.hasNextPage) break;
      after = d.products.pageInfo.endCursor;
    }
  }
  return ids;
}
async function stagePurge() {
  const prods = await dstAllProductIds();
  console.log(`purge: ${prods.length} products to delete`);
  // bulk delete in chunks
  for (let i = 0; i < prods.length; i += 50) {
    const chunk = prods.slice(i, i + 50).map((p) => p.id);
    await gqlDst(`mutation($ids:[ID!]!){productBulkDelete(ids:$ids){count errors{message}}}`, { ids: chunk });
    console.log(`  deleted ${Math.min(i + 50, prods.length)}/${prods.length}`);
  }
  // categories
  let cats = [];
  let after = null;
  for (;;) {
    const d = await gqlDst(`query($a:String){categories(first:100,after:$a){pageInfo{hasNextPage endCursor} edges{node{id name}}}}`, { a: after });
    cats.push(...d.categories.edges.map((e) => e.node));
    if (!d.categories.pageInfo.hasNextPage) break;
    after = d.categories.pageInfo.endCursor;
  }
  console.log(`purge: ${cats.length} categories to delete`);
  for (const c of cats) {
    await gqlDst(`mutation($id:ID!){categoryDelete(id:$id){errors{message}}}`, { id: c.id }).catch((e) => console.warn("  cat del", c.name, e.message));
  }
  console.log("purge: done");
}

// ---------- stage: categories ----------
async function srcCategories() {
  const out = [];
  let after = null;
  for (;;) {
    const d = await gqlSrc(`query($a:String){categories(first:100,after:$a){pageInfo{hasNextPage endCursor} edges{node{name slug description seoTitle seoDescription}}}}`, { a: after });
    out.push(...d.categories.edges.map((e) => e.node));
    if (!d.categories.pageInfo.hasNextPage) break;
    after = d.categories.pageInfo.endCursor;
  }
  return out;
}
async function stageCategories() {
  const cats = await srcCategories();
  let created = 0, existing = 0;
  for (const c of cats) {
    const slug = c.slug || slugify(c.name);
    if (await dstFindCategory(slug)) { existing++; continue; }
    const d = await gqlDst(`mutation($in:CategoryInput!){categoryCreate(input:$in){category{id} errors{field message}}}`,
      { in: { name: c.name, slug, description: c.description || null, seo: { title: c.seoTitle || "", description: c.seoDescription || "" } } });
    if (!d.categoryCreate.category) { console.warn("  cat fail", slug, JSON.stringify(d.categoryCreate.errors)); continue; }
    created++;
  }
  console.log(`categories: ${created} created, ${existing} existing, ${cats.length} total`);
}

// ---------- SRC product fetch ----------
const PRODUCT_FIELDS = `
  name slug description seoTitle seoDescription
  category{slug name}
  productType{name hasVariants}
  channelListings{isPublished visibleInListings isAvailableForPurchase channel{slug}}
  media{url alt sortOrder}
  variants{ sku name attributes{attribute{slug name} values{name}} channelListings{price{amount currency} channel{slug}} }
`;
async function srcProducts() {
  const out = [];
  let after = null;
  for (;;) {
    const d = await gqlSrc(`query($a:String,$c:String!){products(first:50,after:$a,channel:$c){pageInfo{hasNextPage endCursor} edges{node{${PRODUCT_FIELDS}}}}}`,
      { a: after, c: CFG.channel });
    out.push(...d.products.edges.map((e) => e.node));
    if (!d.products.pageInfo.hasNextPage) break;
    after = d.products.pageInfo.endCursor;
  }
  return out;
}

// ---------- DST color swatch value ----------
async function ensureColorValue(colorName) {
  const hex = colorToHex(colorName);
  const slug = slugify(colorName);
  const d = await gqlDst(`query($a:ID!,$s:[String!]){attribute(id:$a){choices(first:1,filter:{slugs:$s}){edges{node{id value}}}}}`,
    { a: ctx.colorAttrId, s: [slug] });
  const existing = d.attribute?.choices?.edges?.[0]?.node;
  if (existing) {
    if (existing.value !== hex) {
      await gqlDst(`mutation($id:ID!,$in:AttributeValueUpdateInput!){attributeValueUpdate(id:$id,input:$in){attributeValue{id} errors{message}}}`,
        { id: existing.id, in: { name: colorName, value: hex } }).catch(() => {});
    }
    return;
  }
  await gqlDst(`mutation($a:ID!,$in:AttributeValueCreateInput!){attributeValueCreate(attribute:$a,input:$in){attributeValue{id} errors{message}}}`,
    { a: ctx.colorAttrId, in: { name: colorName, value: hex } }).catch(() => {});
}

async function dstUpsertVariant(productId, sku, price, colorName) {
  if (colorName) await ensureColorValue(colorName);
  const attributes = colorName ? [{ id: ctx.colorAttrId, values: [colorName] }] : [];
  let variant = await dstFindVariantBySku(sku);
  if (!variant) {
    const d = await gqlDst(`mutation($in:[ProductVariantBulkCreateInput!]!,$p:ID!){productVariantBulkCreate(product:$p,variants:$in){productVariants{id} errors{field message}}}`,
      { p: productId, in: [{ sku, trackInventory: false, attributes }] });
    if (!d.productVariantBulkCreate.productVariants?.length)
      throw new Error("variant " + sku + ": " + JSON.stringify(d.productVariantBulkCreate.errors));
    variant = d.productVariantBulkCreate.productVariants[0];
  }
  await gqlDst(`mutation($id:ID!,$in:[ProductVariantChannelListingAddInput!]!){productVariantChannelListingUpdate(id:$id,input:$in){errors{message}}}`,
    { id: variant.id, in: [{ channelId: ctx.channelId, price: String(price || "50") }] });
  await gqlDst(`mutation($id:ID!,$in:[StockInput!]!){productVariantStocksUpdate(variantId:$id,stocks:$in){errors{message}}}`,
    { id: variant.id, in: [{ warehouse: ctx.warehouseId, quantity: 100 }] });
  return variant.id;
}

// ---------- stage: products ----------
async function upsertProduct(p) {
  const slug = p.slug;
  const isVar = p.productType?.hasVariants;
  const productTypeId = isVar ? ctx.variableTypeId : ctx.simpleTypeId;
  const cat = p.category ? await dstFindCategory(p.category.slug) : null;

  const input = {
    name: p.name, slug, productType: productTypeId,
    ...(cat ? { category: cat.id } : {}),
    description: p.description || null,
    seo: { title: (p.seoTitle || p.name).slice(0, 70), description: (p.seoDescription || "").slice(0, 300) },
  };

  const existing = await dstFindProductBySlug(slug);
  let productId;
  if (existing) {
    const { productType, ...updateInput } = input;
    const d = await gqlDst(`mutation($id:ID!,$in:ProductInput!){productUpdate(id:$id,input:$in){product{id} errors{field message}}}`,
      { id: existing.id, in: updateInput });
    if (!d.productUpdate.product) throw new Error("update " + slug + ": " + JSON.stringify(d.productUpdate.errors));
    productId = d.productUpdate.product.id;
  } else {
    const d = await gqlDst(`mutation($in:ProductCreateInput!){productCreate(input:$in){product{id} errors{field message}}}`,
      { in: input });
    if (!d.productCreate.product) throw new Error("create " + slug + ": " + JSON.stringify(d.productCreate.errors));
    productId = d.productCreate.product.id;
  }

  const srcCh = (p.channelListings || []).find((c) => c.channel.slug === CFG.channel);
  const published = srcCh ? srcCh.isPublished : true;
  const publish = () => gqlDst(`mutation($id:ID!,$in:ProductChannelListingUpdateInput!){productChannelListingUpdate(id:$id,input:$in){errors{message code}}}`,
    { id: productId, in: { updateChannels: [{ channelId: ctx.channelId, isPublished: published, visibleInListings: published, isAvailableForPurchase: published }] } });
  let pr = await publish();
  // Cloud can lag on category persistence; retry once if it complains no category.
  if (pr.productChannelListingUpdate.errors?.some((e) => e.code === "PRODUCT_WITHOUT_CATEGORY") && cat) {
    await gqlDst(`mutation($id:ID!,$in:ProductInput!){productUpdate(id:$id,input:$in){errors{message}}}`, { id: productId, in: { category: cat.id } });
    await new Promise((r) => setTimeout(r, 800));
    pr = await publish();
  }
  const pErrs = pr.productChannelListingUpdate.errors;
  if (pErrs?.length) throw new Error("publish " + slug + ": " + JSON.stringify(pErrs));

  for (const v of p.variants) {
    const colorOpt = (v.attributes || []).find((a) => a.attribute.slug === "color")?.values?.[0]?.name || null;
    const price = (v.channelListings || []).find((c) => c.channel.slug === CFG.channel)?.price?.amount ?? 50;
    await dstUpsertVariant(productId, v.sku, price, colorOpt);
  }
  return { productId, slug, published, nvar: p.variants.length };
}
async function stageProducts() {
  let products = await srcProducts();
  if (ONLY) products = products.filter((p) => p.slug === ONLY);
  products = products.slice(0, LIMIT);
  let ok = 0, fail = 0;
  for (const p of products) {
    try {
      const r = await upsertProduct(p);
      ok++;
      console.log(`  ✓ ${r.slug} (${r.nvar} var, ${r.published ? "published" : "draft"})`);
    } catch (e) { fail++; console.error(`  ✗ ${p.slug}: ${e.message}`); }
  }
  console.log(`products: ${ok} ok, ${fail} failed`);
}

// ---------- stage: images ----------
async function uploadMedia(productId, filePath, alt, attempt = 0) {
  const query = `mutation($product:ID!,$image:Upload!,$alt:String){productMediaCreate(input:{product:$product,image:$image,alt:$alt}){media{id} errors{field message}}}`;
  const operations = JSON.stringify({ query, variables: { product: productId, image: null, alt: (alt || "").slice(0, 250) } });
  const map = JSON.stringify({ "0": ["variables.image"] });
  const form = new FormData();
  form.append("operations", operations);
  form.append("map", map);
  form.append("0", new Blob([readFileSync(filePath)], { type: "image/jpeg" }), "image.jpg");
  let res;
  try {
    await paced();
    res = await fetch(CFG.dstUrl, { method: "POST", headers: { Authorization: `Bearer ${CFG.dstToken}` }, body: form });
  } catch (e) {
    if (attempt < 5) { await sleep(500 * 2 ** attempt); return uploadMedia(productId, filePath, alt, attempt + 1); }
    throw e;
  }
  if ((res.status === 429 || res.status >= 500) && attempt < 5) { await sleep(500 * 2 ** attempt); return uploadMedia(productId, filePath, alt, attempt + 1); }
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  const errs = json.data?.productMediaCreate?.errors;
  if (errs?.length) throw new Error(JSON.stringify(errs));
  return json.data?.productMediaCreate?.media?.id;
}
async function stageImages() {
  let products = await srcProducts();
  if (ONLY) products = products.filter((p) => p.slug === ONLY);
  products = products.slice(0, LIMIT);
  const dir = mkdtempSync(join(tmpdir(), "mirror-img-"));
  let uploaded = 0, skipped = 0, fail = 0;
  for (const p of products) {
    const prod = await dstFindProductBySlug(p.slug);
    if (!prod) { skipped++; continue; }
    // skip if DST product already has media
    const dm = await gqlDst(`query($id:ID!){product(id:$id){media{id}}}`, { id: prod.id });
    if (dm.product?.media?.length) { skipped++; continue; }
    const media = [...(p.media || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    for (let i = 0; i < media.length; i++) {
      const m = media[i];
      try {
        const res = await fetch(m.url);
        if (!res.ok) throw new Error(`download ${res.status}`);
        const raw = join(dir, `${p.slug}-${i}`);
        writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
        const jpg = join(dir, `${p.slug}-${i}.jpg`);
        execFileSync("sips", ["-s", "format", "jpeg", raw, "--out", jpg], { stdio: "ignore" });
        await uploadMedia(prod.id, jpg, m.alt || p.name);
        uploaded++;
      } catch (e) { fail++; console.error(`  ✗ ${p.slug}[${i}]: ${e.message}`); }
    }
    console.log(`  ✓ ${p.slug}: ${media.length} images`);
  }
  console.log(`images: ${uploaded} uploaded, ${skipped} skipped, ${fail} failed`);
}

// ---------- stage: variant-media ----------
// Storefront maps swatch->image via variant.media. The images stage only creates
// product-level media, so replicate the SRC variant->media assignments on DST,
// joining SRC variant.media.alt === DST product.media.alt.
async function stageVariantMedia() {
  let products = await srcProducts();
  if (ONLY) products = products.filter((p) => p.slug === ONLY);
  products = products.slice(0, LIMIT);
  let assigned = 0, skipped = 0, fail = 0;
  for (const p of products) {
    // SRC variant media alts
    const src = await gqlSrc(`query($s:String){product(slug:$s){variants{sku media{alt}}}}`, { s: p.slug });
    const dst = await gqlDst(`query($s:String){product(slug:$s){media{id alt} variants{id sku media{id}}}}`, { s: p.slug });
    if (!dst.product) { skipped++; continue; }
    const altToMedia = new Map((dst.product.media || []).map((m) => [m.alt, m.id]));
    const skuToVar = new Map((dst.product.variants || []).map((v) => [v.sku, v]));
    for (const sv of src.product.variants) {
      const dv = skuToVar.get(sv.sku);
      if (!dv) { continue; }
      const have = new Set((dv.media || []).map((m) => m.id));
      for (const sm of sv.media || []) {
        const mid = altToMedia.get(sm.alt);
        if (!mid) { console.warn(`  ⚠ ${p.slug}/${sv.sku}: no DST media for alt "${sm.alt}"`); continue; }
        if (have.has(mid)) { skipped++; continue; }
        try {
          await variantMediaAssign(dv.id, mid);
          assigned++;
        } catch (e) { fail++; console.error(`  ✗ ${p.slug}/${sv.sku}: ${e.message}`); }
      }
    }
    console.log(`  ✓ ${p.slug}`);
  }
  console.log(`variant-media: ${assigned} assigned, ${skipped} skipped, ${fail} failed`);
}
async function variantMediaAssign(variantId, mediaId) {
  const d = await gqlDst(`mutation($v:ID!,$m:ID!){variantMediaAssign(variantId:$v,mediaId:$m){errors{field message}}}`,
    { v: variantId, m: mediaId });
  const errs = d.variantMediaAssign?.errors;
  if (errs?.length) throw new Error(JSON.stringify(errs));
}

// ---------- stage: verify ----------
async function stageVerify() {
  const d = await gqlDst(`query($c:String!){products(first:1,channel:$c){totalCount}}`, { c: CFG.channel });
  const src = await gqlSrc(`query($c:String!){products(first:1,channel:$c){totalCount}}`, { c: CFG.channel });
  console.log(`verify: SRC=${src.products.totalCount}  DST(${CFG.channel})=${d.products.totalCount}`);
}

// ---------- main ----------
const stage = process.argv[2];
const VALID = ["purge", "setup", "categories", "products", "images", "variant-media", "verify", "all"];
(async () => {
  if (!VALID.includes(stage)) {
    console.error("Usage: node scripts/mirror-saleor-to-cloud.mjs <" + VALID.join("|") + "> [--limit N] [--only slug]");
    process.exit(1);
  }
  if (!CFG.dstToken) throw new Error("DST_TOKEN env required (Cloud staff token)");
  await srcLogin();
  await loadDstContext();
  if (stage === "purge") return void (await stagePurge());
  if (["setup", "categories", "products", "images", "all"].includes(stage)) await stageSetup();
  if (stage === "categories" || stage === "all") await stageCategories();
  if (stage === "products" || stage === "all") await stageProducts();
  if (stage === "images" || stage === "all") await stageImages();
  if (stage === "variant-media" || stage === "all") await stageVariantMedia();
  if (stage === "verify" || stage === "all") await stageVerify();
  console.log("done.");
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
