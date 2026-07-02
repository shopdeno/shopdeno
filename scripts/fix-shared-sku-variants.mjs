#!/usr/bin/env node
// Bulk fix: adds missing color variants for all WC variable products where all variations
// share the same parent SKU (causing migration to create only 1 Saleor variant).
//
// Usage: node scripts/fix-shared-sku-variants.mjs [--only <wcId>] [--dry-run]
//
// Skips products that already have 2+ Saleor variants. Safe to re-run.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CFG = {
  wcBase: "http://shop-deno-local.local",
  wcUser: "admin",
  wcPass: "QF0GVwpEjlkxSwBXM8MrVS0d",
  saleorUrl: "http://localhost:8000/graphql/",
  saleorEmail: "admin@example.com",
  saleorPassword: "admin",
  channel: "default-channel",
  warehouse: "Default Warehouse",
};

const COLOR_HEX = {
  red: "#dc2626", blue: "#2563eb", green: "#16a34a", black: "#111827",
  white: "#f9fafb", yellow: "#ca8a04", orange: "#ea580c", purple: "#9333ea",
  pink: "#ec4899", brown: "#92400e", gray: "#6b7280", grey: "#6b7280",
  silver: "#9ca3af", gold: "#d97706", navy: "#1e3a8a", teal: "#0d9488",
  maroon: "#9f1239", lime: "#84cc16", turquoise: "#14b8a6",
  burgundy: "#9f1239", "light-blue": "#93c5fd",
};
const slugify = (s) =>
  (s || "").toString().toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] ?? true : null; };
const ONLY = flag("only");
const DRY_RUN = flag("dry-run") !== null;
if (DRY_RUN) console.log("[DRY RUN — no writes]");

const wcAuth = "Basic " + Buffer.from(`${CFG.wcUser}:${CFG.wcPass}`).toString("base64");
let TOKEN = null;

async function wc(path) {
  const res = await fetch(`${CFG.wcBase}/wp-json/wc/v3/${path}`, { headers: { Authorization: wcAuth } });
  if (!res.ok) throw new Error(`WC ${path} -> ${res.status}`);
  return res.json();
}

async function gql(query, variables = {}) {
  const res = await fetch(CFG.saleorUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error("GQL: " + JSON.stringify(json.errors));
  return json.data;
}

async function login() {
  const d = await gql(
    `mutation($e:String!,$p:String!){tokenCreate(email:$e,password:$p){token errors{message}}}`,
    { e: CFG.saleorEmail, p: CFG.saleorPassword }
  );
  if (!d.tokenCreate.token) throw new Error("Login failed: " + JSON.stringify(d.tokenCreate.errors));
  TOKEN = d.tokenCreate.token;
}

async function uploadMedia(productId, filePath, alt) {
  const query = `mutation($product:ID!,$image:Upload!,$alt:String){productMediaCreate(input:{product:$product,image:$image,alt:$alt}){media{id} errors{field message}}}`;
  const operations = JSON.stringify({ query, variables: { product: productId, image: null, alt: alt.slice(0, 250) } });
  const form = new FormData();
  form.append("operations", operations);
  form.append("map", JSON.stringify({ "0": ["variables.image"] }));
  form.append("0", new Blob([readFileSync(filePath)], { type: "image/jpeg" }), "image.jpg");
  const res = await fetch(CFG.saleorUrl, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: form });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  const errs = json.data?.productMediaCreate?.errors;
  if (errs?.length) throw new Error(JSON.stringify(errs));
  return json.data.productMediaCreate.media.id;
}

async function assignMediaToVariant(variantId, mediaId) {
  const r = await gql(
    `mutation($v:ID!,$m:ID!){variantMediaAssign(variantId:$v,mediaId:$m){errors{field message}}}`,
    { v: variantId, m: mediaId }
  );
  if (r.variantMediaAssign?.errors?.length) throw new Error(JSON.stringify(r.variantMediaAssign.errors));
}

async function ensureColorValue(colorAttrId, colorName) {
  const hex = COLOR_HEX[colorName.toLowerCase().trim()] ?? "#9ca3af";
  const slug = slugify(colorName);
  const d = await gql(
    `query($a:ID!,$s:[String!]){attribute(id:$a){choices(first:1,filter:{slugs:$s}){edges{node{id value}}}}}`,
    { a: colorAttrId, s: [slug] }
  );
  const existing = d.attribute?.choices?.edges?.[0]?.node;
  if (existing) {
    if (existing.value !== hex) {
      await gql(
        `mutation($id:ID!,$in:AttributeValueUpdateInput!){attributeValueUpdate(id:$id,input:$in){attributeValue{id} errors{field message}}}`,
        { id: existing.id, in: { name: colorName, value: hex } }
      ).catch(() => {});
    }
    return;
  }
  await gql(
    `mutation($a:ID!,$in:AttributeValueCreateInput!){attributeValueCreate(attribute:$a,input:$in){attributeValue{id} errors{field message}}}`,
    { a: colorAttrId, in: { name: colorName, value: hex } }
  ).catch(() => {});
}

async function fixProduct(wcProd, wcVariations, salProd, colorAttrId, channelId, warehouseId, tmpDir) {
  const parentSku = wcProd.sku || `DM-${wcProd.id}`;
  const existingVariant = salProd.variants[0];
  let firstColor = true;

  for (const v of wcVariations) {
    const colorOpt = v.attributes.find((a) => /colou?r/i.test(a.name))?.option;
    if (!colorOpt) { console.log(`    ! variation ${v.id}: no Color attribute, skipping`); continue; }
    const colorKey = colorOpt.toLowerCase().replace(/\s+/g, "-");
    const sku = `${parentSku}-${colorKey}`;
    const altText = `${wcProd.name} ${colorOpt} matatu art print by Dennis Muraguri`;

    if (DRY_RUN) {
      console.log(`    [dry] would create/update ${sku} color=${colorOpt}`);
      continue;
    }

    await ensureColorValue(colorAttrId, colorOpt);

    let variantId;
    if (firstColor) {
      // Rename the existing single variant to the first color variant
      const upd = await gql(
        `mutation($id:ID!,$in:ProductVariantInput!){productVariantUpdate(id:$id,input:$in){productVariant{id sku} errors{field message}}}`,
        { id: existingVariant.id, in: { sku, attributes: [{ id: colorAttrId, values: [colorOpt] }] } }
      );
      if (upd.productVariantUpdate?.errors?.length)
        throw new Error(`Update existing variant: ` + JSON.stringify(upd.productVariantUpdate.errors));
      variantId = existingVariant.id;
      console.log(`    ✓ renamed ${existingVariant.sku} → ${sku} (${colorOpt})`);

      // Assign existing main media to this variant (if any)
      const mainMedia = salProd.media.find((m) => m.alt && m.alt.toLowerCase().includes("matatu art print"));
      if (mainMedia) {
        await assignMediaToVariant(variantId, mainMedia.id).catch(() => {});
      }
      firstColor = false;
    } else {
      // Check if this variant already exists
      const existCheck = await gql(`query($s:String){productVariant(sku:$s){id}}`, { s: sku });
      variantId = existCheck.productVariant?.id;
      if (!variantId) {
        const cr = await gql(
          `mutation($p:ID!,$in:[ProductVariantBulkCreateInput!]!){productVariantBulkCreate(product:$p,variants:$in){productVariants{id sku} errors{field message}}}`,
          { p: salProd.id, in: [{ sku, trackInventory: false, attributes: [{ id: colorAttrId, values: [colorOpt] }] }] }
        );
        if (!cr.productVariantBulkCreate.productVariants?.length)
          throw new Error(`Create ${sku}: ` + JSON.stringify(cr.productVariantBulkCreate.errors));
        variantId = cr.productVariantBulkCreate.productVariants[0].id;
        console.log(`    ✓ created ${sku} (${colorOpt})`);
      } else {
        console.log(`    → ${sku} exists, updating`);
        // Ensure attributes are set on existing variant
        await gql(
          `mutation($id:ID!,$in:ProductVariantInput!){productVariantUpdate(id:$id,input:$in){productVariant{id} errors{field message}}}`,
          { id: variantId, in: { attributes: [{ id: colorAttrId, values: [colorOpt] }] } }
        );
      }
    }

    // Channel listing + stock
    await gql(
      `mutation($id:ID!,$in:[ProductVariantChannelListingAddInput!]!){productVariantChannelListingUpdate(id:$id,input:$in){errors{field message}}}`,
      { id: variantId, in: [{ channelId, price: "50" }] }
    );
    await gql(
      `mutation($id:ID!,$in:[StockInput!]!){productVariantStocksUpdate(variantId:$id,stocks:$in){errors{field message}}}`,
      { id: variantId, in: [{ warehouse: warehouseId, quantity: 100 }] }
    );

    // Image — skip if variant already has media
    const varMedia = await gql(`query($id:ID!){productVariant(id:$id){media{id}}}`, { id: variantId });
    if (varMedia.productVariant?.media?.length) { console.log(`    → ${sku}: image already assigned`); continue; }

    if (!v.image?.src) { console.warn(`    ! ${sku}: no image in WC`); continue; }

    try {
      const imgRes = await fetch(v.image.src, { headers: { Authorization: wcAuth } });
      if (!imgRes.ok) throw new Error(`download ${imgRes.status}`);
      const rawPath = join(tmpDir, `var-${wcProd.id}-${v.id}`);
      writeFileSync(rawPath, Buffer.from(await imgRes.arrayBuffer()));
      const jpgPath = rawPath + ".jpg";
      execFileSync("sips", ["-s", "format", "jpeg", rawPath, "--out", jpgPath], { stdio: "ignore" });
      const mediaId = await uploadMedia(salProd.id, jpgPath, altText);
      await assignMediaToVariant(variantId, mediaId);
      console.log(`    ✓ ${sku}: image uploaded + assigned`);
    } catch (e) {
      console.error(`    ✗ ${sku} image: ${e.message}`);
    }
  }
}

async function main() {
  await login();
  console.log("Logged in to Saleor.\n");

  const ctx = await gql(`{ channels{ id slug } warehouses(first:20){ edges{ node{ id name } } } }`);
  const channelId = ctx.channels.find((c) => c.slug === CFG.channel)?.id;
  const warehouseId = ctx.warehouses.edges.find((w) => w.node.name === CFG.warehouse)?.node.id;
  if (!channelId || !warehouseId) throw new Error("Channel or warehouse not found");

  const attrData = await gql(`{ attributes(first:1,where:{slug:{oneOf:["color"]}}){ edges{ node{ id } } } }`);
  const colorAttrId = attrData.attributes.edges[0]?.node?.id;
  if (!colorAttrId) throw new Error("Color attribute not found");

  // Load all Saleor products (slug → product map)
  const allSalData = await gql(`{ products(first:100) { edges { node { id name slug variants { id sku } media { id url alt } } } } }`);
  const salBySlug = {};
  for (const e of allSalData.products.edges) salBySlug[e.node.slug] = e.node;

  // Get all WC variable products
  let wcProds = await wc("products?type=variable&per_page=100&status=any");
  if (ONLY) wcProds = wcProds.filter((p) => String(p.id) === String(ONLY));

  const tmpDir = mkdtempSync(join(tmpdir(), "fix-variants-"));
  let fixed = 0, skipped = 0, failed = 0;

  for (const wcProd of wcProds) {
    const wcSlug = wcProd.slug || `${slugify(wcProd.name)}-${wcProd.id}`;
    const salProd = salBySlug[wcSlug];

    if (!salProd) {
      console.log(`  [skip] ${wcProd.name}: not in Saleor (slug: ${wcSlug})`);
      skipped++;
      continue;
    }

    // Skip if already has 2+ variants (already fixed or unique-SKU product)
    if (salProd.variants.length >= 2) {
      console.log(`  [skip] ${wcProd.name}: already has ${salProd.variants.length} variants`);
      skipped++;
      continue;
    }

    // Get WC variations
    const variations = await wc(`products/${wcProd.id}/variations?per_page=100`);
    if (variations.length <= 1) {
      console.log(`  [skip] ${wcProd.name}: only ${variations.length} WC variation(s)`);
      skipped++;
      continue;
    }

    // Only fix if all variations share the same SKU (the shared-SKU problem)
    const uniqueSkus = new Set(variations.map((v) => v.sku).filter(Boolean));
    const hasSharedSku = uniqueSkus.size <= 1;
    if (!hasSharedSku) {
      console.log(`  [skip] ${wcProd.name}: has unique variation SKUs (${[...uniqueSkus].join(", ")}), already handled by migration`);
      skipped++;
      continue;
    }

    console.log(`  → ${wcProd.name} (WC ${wcProd.id}): ${variations.length} variations, shared SKU ${[...uniqueSkus][0] || "empty"}`);

    try {
      await fixProduct(wcProd, variations, salProd, colorAttrId, channelId, warehouseId, tmpDir);
      fixed++;
    } catch (e) {
      console.error(`  ✗ ${wcProd.name}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${fixed} fixed, ${skipped} skipped, ${failed} failed.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
