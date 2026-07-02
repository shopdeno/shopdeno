#!/usr/bin/env node
// One-off fix: adds the 5 missing color variants to Deathrow - Ongata Line Sacco in Saleor.
//
// Root cause: WC product 175 is variable with 5 variations that all share SKU DM-175.
// Migration created only 1 Saleor variant (idempotent by SKU). This script:
//   1. Renames existing DM-175 variant → DM-175-blue + sets Color=Blue
//   2. Downloads each variation image from local WC, converts, uploads, creates variant, assigns image
//   3. Fixes the second media item's alt text

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
  blue: "#2563eb", purple: "#9333ea", green: "#16a34a",
  pink: "#ec4899", orange: "#ea580c",
};
const slugify = (s) =>
  (s || "").toString().toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

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
  const hex = COLOR_HEX[colorName.toLowerCase()] ?? "#9ca3af";
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

async function main() {
  await login();
  console.log("Logged in to Saleor.");

  // Load channel + warehouse IDs
  const ctx = await gql(`{ channels{ id slug } warehouses(first:20){ edges{ node{ id name } } } }`);
  const channelId = ctx.channels.find((c) => c.slug === CFG.channel)?.id;
  const warehouseId = ctx.warehouses.edges.find((w) => w.node.name === CFG.warehouse)?.node.id;
  if (!channelId || !warehouseId) throw new Error("Channel or warehouse not found");

  // Find Color attribute
  const attrData = await gql(`{ attributes(first:1,where:{slug:{oneOf:["color"]}}){ edges{ node{ id } } } }`);
  const colorAttrId = attrData.attributes.edges[0]?.node?.id;
  if (!colorAttrId) throw new Error("Color attribute not found in Saleor");
  console.log("Color attr:", colorAttrId);

  // Find Deathrow product in Saleor
  const prodData = await gql(`
    { products(first:1, filter:{slugs:["deathrow-ongata-line-sacco"]}) {
        edges { node {
          id name slug
          variants { id sku }
          media { id url alt }
        }}
    }}
  `);

  // filter:slugs may not work — fall back to listing all
  let prod = prodData.products.edges[0]?.node;
  if (!prod) {
    const all = await gql(`{ products(first:100) { edges { node { id name slug variants { id sku } media { id url alt } } } } }`);
    prod = all.products.edges.find((e) => e.node.slug === "deathrow-ongata-line-sacco")?.node;
  }
  if (!prod) throw new Error("Deathrow not found in Saleor");
  console.log(`Found: ${prod.name} (${prod.id}), ${prod.variants.length} variant(s), ${prod.media.length} media`);

  // Existing variant (should be DM-175)
  const existingVariant = prod.variants[0];
  if (!existingVariant) throw new Error("No existing variant found");
  console.log(`Existing variant: ${existingVariant.sku} (${existingVariant.id})`);

  // Fetch WC variations for Deathrow (product ID 175)
  const wcVariations = await wc("products/175/variations?per_page=20");
  console.log(`WC variations: ${wcVariations.length}`);

  const tmpDir = mkdtempSync(join(tmpdir(), "deathrow-fix-"));

  // Map color → variant id (we'll populate this as we go)
  const variantsByColor = {};

  // Step 1: rename existing DM-175 variant to DM-175-blue + set Color=Blue
  // Find the Blue variation in WC to get its image
  const blueVar = wcVariations.find((v) => v.attributes.some((a) => a.option.toLowerCase() === "blue"));
  if (blueVar) {
    await ensureColorValue(colorAttrId, "Blue");
    const updateResult = await gql(
      `mutation($id:ID!,$in:ProductVariantInput!){productVariantUpdate(id:$id,input:$in){productVariant{id sku} errors{field message}}}`,
      { id: existingVariant.id, in: { sku: "DM-175-blue", attributes: [{ id: colorAttrId, values: ["Blue"] }] } }
    );
    if (updateResult.productVariantUpdate?.errors?.length) {
      throw new Error("Update existing variant: " + JSON.stringify(updateResult.productVariantUpdate.errors));
    }
    console.log(`  ✓ Renamed ${existingVariant.sku} → DM-175-blue + Color=Blue`);
    variantsByColor["blue"] = existingVariant.id;

    // Assign existing main media to Blue variant (first media item has good alt)
    const mainMedia = prod.media.find((m) => m.alt.includes("matatu art print"));
    if (mainMedia) {
      await assignMediaToVariant(existingVariant.id, mainMedia.id);
      console.log(`  ✓ Assigned existing main image to Blue variant`);
    }
  }

  // Step 2: Fix second media alt text if incomplete
  const badAltMedia = prod.media.find((m) => m.alt === "Deathrow" || !m.alt.includes("matatu art print"));
  if (badAltMedia) {
    await gql(
      `mutation($id:ID!,$in:ProductMediaUpdateInput!){productMediaUpdate(id:$id,input:$in){media{id alt} errors{field message}}}`,
      { id: badAltMedia.id, in: { alt: "Deathrow matatu art print by Dennis Muraguri" } }
    );
    console.log(`  ✓ Fixed alt text on media ${badAltMedia.id}`);
  }

  // Step 3: Create remaining color variants + upload their images
  for (const v of wcVariations) {
    const colorOpt = v.attributes.find((a) => /colou?r/i.test(a.name))?.option;
    if (!colorOpt) continue;
    const colorKey = colorOpt.toLowerCase();
    if (colorKey === "blue") continue; // already handled above

    const sku = `DM-175-${colorKey}`;
    const altText = `Deathrow ${colorOpt} matatu art print by Dennis Muraguri`;

    // Ensure color swatch value exists
    await ensureColorValue(colorAttrId, colorOpt);

    // Check if variant already exists
    const existingCheck = await gql(`query($s:String){productVariant(sku:$s){id}}`, { s: sku });
    let variantId = existingCheck.productVariant?.id;

    if (!variantId) {
      const createResult = await gql(
        `mutation($p:ID!,$in:[ProductVariantBulkCreateInput!]!){productVariantBulkCreate(product:$p,variants:$in){productVariants{id sku} errors{field message}}}`,
        { p: prod.id, in: [{ sku, trackInventory: false, attributes: [{ id: colorAttrId, values: [colorOpt] }] }] }
      );
      if (!createResult.productVariantBulkCreate.productVariants?.length) {
        throw new Error(`Create ${sku}: ` + JSON.stringify(createResult.productVariantBulkCreate.errors));
      }
      variantId = createResult.productVariantBulkCreate.productVariants[0].id;
      console.log(`  ✓ Created variant ${sku} (${variantId})`);
    } else {
      console.log(`  → Variant ${sku} already exists (${variantId})`);
    }

    // Set channel listing + stock
    await gql(
      `mutation($id:ID!,$in:[ProductVariantChannelListingAddInput!]!){productVariantChannelListingUpdate(id:$id,input:$in){errors{field message}}}`,
      { id: variantId, in: [{ channelId, price: "50" }] }
    );
    await gql(
      `mutation($id:ID!,$in:[StockInput!]!){productVariantStocksUpdate(variantId:$id,stocks:$in){errors{field message}}}`,
      { id: variantId, in: [{ warehouse: warehouseId, quantity: 100 }] }
    );

    // Check if variant already has media
    const varMedia = await gql(`query($id:ID!){productVariant(id:$id){media{id}}}`, { id: variantId });
    if (varMedia.productVariant?.media?.length) {
      console.log(`  → ${sku} already has image, skipping upload`);
      continue;
    }

    // Download + convert + upload variation image
    if (!v.image?.src) {
      console.warn(`  ! ${sku}: no image URL in WC`);
      continue;
    }

    try {
      const imgRes = await fetch(v.image.src, { headers: { Authorization: wcAuth } });
      if (!imgRes.ok) throw new Error(`download ${imgRes.status}`);
      const rawPath = join(tmpDir, `var-${v.id}`);
      writeFileSync(rawPath, Buffer.from(await imgRes.arrayBuffer()));
      const jpgPath = join(tmpDir, `var-${v.id}.jpg`);
      execFileSync("sips", ["-s", "format", "jpeg", rawPath, "--out", jpgPath], { stdio: "ignore" });
      const mediaId = await uploadMedia(prod.id, jpgPath, altText);
      await assignMediaToVariant(variantId, mediaId);
      console.log(`  ✓ ${sku}: uploaded + assigned image`);
    } catch (e) {
      console.error(`  ✗ ${sku} image: ${e.message}`);
    }
  }

  console.log("\nDone. Verify at http://localhost:9000 or /products/deathrow-ongata-line-sacco");
}

main().catch((e) => { console.error(e); process.exit(1); });
