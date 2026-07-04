#!/usr/bin/env node
/**
 * Creates (or deletes) a $1 test product for studio pickup checkout testing.
 * Usage:
 *   node scripts/create-test-product.mjs          # create
 *   node scripts/create-test-product.mjs --delete  # delete
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
try {
  const env = readFileSync(resolve(__dirname, "../.env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2].trim();
  }
} catch {}

const SALEOR_URL = process.env.NEXT_PUBLIC_SALEOR_API_URL || "https://store-drwvfcof.eu.saleor.cloud/graphql/";
const ADMIN_TOKEN = process.env.SALEOR_ADMIN_TOKEN;
const CHANNEL = process.env.NEXT_PUBLIC_SALEOR_CHANNEL || "default-channel";

// Known from migration — Default Warehouse
const WAREHOUSE_ID = "V2FyZWhvdXNlOmExNzJmZDQ0LTViNWYtNGE4Ni1iZjQ0LTNhYTE1MDIyMjUwMg==";

// From productTypes query
const PRODUCT_TYPE_ID = "UHJvZHVjdFR5cGU6MjU="; // Matatu Art Print (simple, no variants)
const CHANNEL_ID = "Q2hhbm5lbDox"; // default-channel

// Category: grab the first matatu one — "Random Mats" via MCP was Q2F0ZWdvcnk6MTIy
// Fall back to Default Category
const CATEGORY_ID = "Q2F0ZWdvcnk6MTIy";

const PRODUCT_SLUG = "test-studio-pickup";
const PRODUCT_NAME = "[TEST] Studio Pickup";
const SKU = "DM-TEST-PICKUP";

if (!ADMIN_TOKEN) {
  console.error("SALEOR_ADMIN_TOKEN not set. Add it to .env and retry.");
  process.exit(1);
}

async function gql(query, variables = {}) {
  const res = await fetch(SALEOR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error("GQL errors:", JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

async function findExisting() {
  const d = await gql(
    `query($slug:String!){ product(slug:$slug){ id variants{ id } } }`,
    { slug: PRODUCT_SLUG }
  );
  return d?.product;
}

async function deleteProduct(productId) {
  const d = await gql(
    `mutation($id:ID!){ productDelete(id:$id){ product{ id name } errors{ field message } } }`,
    { id: productId }
  );
  const errs = d?.productDelete?.errors;
  if (errs?.length) throw new Error(errs.map((e) => e.message).join(", "));
  console.log("✅ Deleted:", d?.productDelete?.product?.name);
}

async function createProduct() {
  const description = JSON.stringify({
    time: Date.now(),
    blocks: [
      {
        type: "paragraph",
        data: { text: "Test product for studio pickup checkout flow. Delete after testing." },
      },
    ],
    version: "2.26.5",
  });

  // 1. Create product
  console.log("Creating product...");
  const create = await gql(
    `mutation($in: ProductCreateInput!) {
      productCreate(input: $in) {
        product { id slug }
        errors { field message }
      }
    }`,
    {
      in: {
        name: PRODUCT_NAME,
        slug: PRODUCT_SLUG,
        productType: PRODUCT_TYPE_ID,
        category: CATEGORY_ID,
        description,
        seo: {
          title: "[TEST] Studio Pickup — Dennis Muraguri",
          description: "Test product for studio pickup checkout flow.",
        },
      },
    }
  );
  const errs1 = create?.productCreate?.errors;
  if (errs1?.length) throw new Error("productCreate: " + errs1.map((e) => e.message).join(", "));
  const productId = create.productCreate.product.id;
  console.log("  Product ID:", productId);

  // 2. Create variant
  console.log("Creating variant...");
  const bulk = await gql(
    `mutation($p:ID!, $in:[ProductVariantBulkCreateInput!]!) {
      productVariantBulkCreate(product:$p, variants:$in) {
        productVariants { id }
        errors { field message }
      }
    }`,
    {
      p: productId,
      in: [{ sku: SKU, trackInventory: true, attributes: [] }],
    }
  );
  const errs2 = bulk?.productVariantBulkCreate?.errors;
  if (errs2?.length) throw new Error("variantCreate: " + errs2.map((e) => e.message).join(", "));
  const variantId = bulk.productVariantBulkCreate.productVariants[0].id;
  console.log("  Variant ID:", variantId);

  // 3. Add product to channel FIRST (required before variant pricing)
  console.log("Adding to default-channel...");
  const pub = await gql(
    `mutation($id:ID!, $in:ProductChannelListingUpdateInput!) {
      productChannelListingUpdate(id:$id, input:$in) {
        errors { field message }
      }
    }`,
    {
      id: productId,
      in: {
        updateChannels: [
          {
            channelId: CHANNEL_ID,
            isPublished: true,
            visibleInListings: true,
            isAvailableForPurchase: true,
          },
        ],
      },
    }
  );
  const errs3 = pub?.productChannelListingUpdate?.errors;
  if (errs3?.length) throw new Error("channelListing: " + errs3.map((e) => e.message).join(", "));

  // 4. Set price on variant
  console.log("Setting price $1.00...");
  const price = await gql(
    `mutation($id:ID!, $in:[ProductVariantChannelListingAddInput!]!) {
      productVariantChannelListingUpdate(id:$id, input:$in) {
        errors { field message }
      }
    }`,
    {
      id: variantId,
      in: [{ channelId: CHANNEL_ID, price: 1.0 }],
    }
  );
  const errs4 = price?.productVariantChannelListingUpdate?.errors;
  if (errs4?.length) throw new Error("pricingUpdate: " + errs4.map((e) => e.message).join(", "));

  // 5. Set stock
  console.log("Setting stock (qty 5)...");
  const stock = await gql(
    `mutation($id:ID!, $in:[StockInput!]!) {
      productVariantStocksUpdate(variantId:$id, stocks:$in) {
        errors { field message }
      }
    }`,
    {
      id: variantId,
      in: [{ warehouse: WAREHOUSE_ID, quantity: 5 }],
    }
  );
  const errs5 = stock?.productVariantStocksUpdate?.errors;
  if (errs5?.length) throw new Error("stocksUpdate: " + errs5.map((e) => e.message).join(", "));

  console.log("\n✅ Done!");
  console.log(`   Product: https://shop.dennis-muraguri.co.ke/products/${PRODUCT_SLUG}`);
  console.log(`   ID: ${productId}`);
  console.log(`   Delete when done: node scripts/create-test-product.mjs --delete`);
}

async function configureExisting(productId, variantId) {
  console.log("Configuring existing product...");

  const pub = await gql(
    `mutation($id:ID!, $in:ProductChannelListingUpdateInput!) {
      productChannelListingUpdate(id:$id, input:$in) {
        errors { field message }
      }
    }`,
    {
      id: productId,
      in: {
        updateChannels: [
          { channelId: CHANNEL_ID, isPublished: true, visibleInListings: true, isAvailableForPurchase: true },
        ],
      },
    }
  );
  const e1 = pub?.productChannelListingUpdate?.errors;
  if (e1?.length) console.warn("channelListing:", e1.map((e) => e.message).join(", "));
  else console.log("  Channel listing set.");

  const price = await gql(
    `mutation($id:ID!, $in:[ProductVariantChannelListingAddInput!]!) {
      productVariantChannelListingUpdate(id:$id, input:$in) {
        errors { field message }
      }
    }`,
    { id: variantId, in: [{ channelId: CHANNEL_ID, price: 1.0 }] }
  );
  const e2 = price?.productVariantChannelListingUpdate?.errors;
  if (e2?.length) console.warn("pricingUpdate:", e2.map((e) => e.message).join(", "));
  else console.log("  Price set $1.00.");

  const stock = await gql(
    `mutation($id:ID!, $in:[StockInput!]!) {
      productVariantStocksUpdate(variantId:$id, stocks:$in) {
        errors { field message }
      }
    }`,
    { id: variantId, in: [{ warehouse: WAREHOUSE_ID, quantity: 5 }] }
  );
  const e3 = stock?.productVariantStocksUpdate?.errors;
  if (e3?.length) console.warn("stocksUpdate:", e3.map((e) => e.message).join(", "));
  else console.log("  Stock set 5.");

  console.log("\n✅ Done!");
  console.log(`   https://shop.dennis-muraguri.co.ke/products/${PRODUCT_SLUG}`);
}

const isDelete = process.argv.includes("--delete");

const existing = await findExisting();

if (isDelete) {
  if (!existing) {
    console.log("Test product not found — nothing to delete.");
  } else {
    await deleteProduct(existing.id);
  }
} else {
  if (existing) {
    const variantId = existing.variants?.[0]?.id;
    if (variantId) {
      await configureExisting(existing.id, variantId);
    } else {
      console.log("Product exists but no variant found. Check Saleor dashboard.");
    }
  } else {
    await createProduct();
  }
}
