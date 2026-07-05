#!/usr/bin/env node
// Sets up Saleor shipping zones to match WooCommerce configuration.
//
// Deletes all existing demo zones, then creates 8 zones with flat-rate USD
// prices matching the live WooCommerce shop.
//
// Usage:
//   node scripts/setup-shipping-zones.mjs [--dry-run]
//
// Config via env (falls back to local Docker defaults):
//   SALEOR_URL, SALEOR_APP_TOKEN, SALEOR_EMAIL, SALEOR_PASSWORD

const CFG = {
  saleorUrl: process.env.SALEOR_URL || "http://localhost:8000/graphql/",
  appToken: process.env.SALEOR_APP_TOKEN || "",
  saleorEmail: process.env.SALEOR_EMAIL || "admin@example.com",
  saleorPassword: process.env.SALEOR_PASSWORD || "admin",
  channel: process.env.CHANNEL || "default-channel",
  dryRun: process.argv.includes("--dry-run"),
};

// ---------------------------------------------------------------------------
// Zone definitions — mirrored from WooCommerce
// ---------------------------------------------------------------------------

const ZONES = [
  {
    name: "Kenya",
    countries: ["KE"],
    price: 5,
    useClickAndCollect: true, // add the KE studio warehouse
  },
  {
    name: "Tanzania and Uganda",
    countries: ["TZ", "UG"],
    price: 22,
  },
  {
    name: "Rest of Africa",
    countries: [
      "DZ","AO","BJ","BW","BF","BI","CM","CV","CF","TD","KM","CG","CD","DJ",
      "EG","GQ","ER","SZ","ET","GA","GM","GH","GN","GW","CI","LS","LR","LY",
      "MG","MW","ML","MR","MU","YT","MA","MZ","NA","NE","NG","RE","RW","ST",
      "SH","SN","SC","SL","SO","ZA","SS","SD","TG","TN","EH","ZM","ZW","TF",
    ],
    price: 40,
  },
  {
    name: "Europe",
    countries: [
      "AM","AZ","CY","GE","KZ","AX","AL","AD","AT","BY","BE","BA","BG","HR",
      "CZ","DK","EE","FO","FI","FR","DE","GI","GR","GG","HU","IS","IE","IM",
      "IT","JE","LV","LI","LT","LU","MT","MD","MC","ME","NL","MK","NO","PL",
      "PT","RO","RU","SM","RS","SK","SI","ES","SJ","SE","CH","TR","UA","VA","GL",
    ],
    price: 37,
  },
  {
    name: "USA and Canada",
    countries: ["US", "CA"],
    price: 60,
  },
  {
    name: "Middle East and Asia",
    countries: [
      "AF","BH","BD","BT","BN","KH","CN","IN","ID","IR","IQ","IL","JP","JO",
      "KZ","KW","KG","LA","LB","MY","MV","MN","MM","NP","KP","OM","PK","PS",
      "PH","QA","SA","SG","KR","LK","SY","TW","TJ","TH","TL","TM","AE","UZ",
      "VN","YE","RU",
    ],
    price: 40,
  },
  {
    name: "Australia",
    countries: ["AU"],
    price: 80,
  },
  {
    name: "Rest of World",
    countries: [], // default: true — catches all unassigned countries
    default: true,
    price: 40,
  },
];

// ---------------------------------------------------------------------------
// GraphQL helpers
// ---------------------------------------------------------------------------

let SALEOR_TOKEN = null;

async function gql(query, variables = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = CFG.appToken || SALEOR_TOKEN;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(CFG.saleorUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error("GQL error: " + JSON.stringify(json.errors));
  return json.data;
}

async function saleorLogin() {
  const d = await gql(
    `mutation($e:String!,$p:String!){tokenCreate(email:$e,password:$p){token errors{message}}}`,
    { e: CFG.saleorEmail, p: CFG.saleorPassword }
  );
  if (!d.tokenCreate.token)
    throw new Error("Saleor login failed: " + JSON.stringify(d.tokenCreate.errors));
  SALEOR_TOKEN = d.tokenCreate.token;
  console.log("  Authenticated via staff login");
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

async function getChannel() {
  const d = await gql(`{ channels { id slug } }`);
  const ch = d.channels.find((c) => c.slug === CFG.channel);
  if (!ch) throw new Error(`Channel "${CFG.channel}" not found`);
  return ch;
}

async function getWarehouses() {
  const d = await gql(`{
    warehouses(first: 30) {
      edges { node {
        id name clickAndCollectOption
        address { country { code } }
      }}
    }
  }`);
  return d.warehouses.edges.map((e) => e.node);
}

async function getExistingZones() {
  const d = await gql(`{
    shippingZones(first: 50) {
      edges { node { id name } }
    }
  }`);
  return d.shippingZones.edges.map((e) => e.node);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

async function deleteZone(id, name) {
  console.log(`  Deleting zone: ${name} (${id})`);
  if (CFG.dryRun) return;
  const d = await gql(
    `mutation($id: ID!) { shippingZoneDelete(id: $id) { errors { field message } } }`,
    { id }
  );
  if (d.shippingZoneDelete.errors.length)
    throw new Error("Delete zone error: " + JSON.stringify(d.shippingZoneDelete.errors));
}

async function createZone(input) {
  if (CFG.dryRun) {
    console.log(`  [dry-run] Would create zone: ${input.name}`);
    return "dry-run-id";
  }
  const d = await gql(
    `mutation($input: ShippingZoneCreateInput!) {
      shippingZoneCreate(input: $input) {
        shippingZone { id name }
        errors { field message code }
      }
    }`,
    { input }
  );
  if (d.shippingZoneCreate.errors.length)
    throw new Error("Create zone error: " + JSON.stringify(d.shippingZoneCreate.errors));
  return d.shippingZoneCreate.shippingZone.id;
}

async function updateZoneWarehouses(id, addWarehouses) {
  if (CFG.dryRun) return;
  const d = await gql(
    `mutation($id: ID!, $input: ShippingZoneUpdateInput!) {
      shippingZoneUpdate(id: $id, input: $input) {
        shippingZone { id name }
        errors { field message code }
      }
    }`,
    { id, input: { addWarehouses } }
  );
  if (d.shippingZoneUpdate.errors.length)
    throw new Error("Update zone warehouses error: " + JSON.stringify(d.shippingZoneUpdate.errors));
}

async function addWarehouseToChannel(channelId, warehouseId) {
  if (CFG.dryRun) return;
  const d = await gql(
    `mutation($id: ID!, $input: ChannelUpdateInput!) {
      channelUpdate(id: $id, input: $input) {
        channel { id slug warehouses { id name } }
        errors { field message code }
      }
    }`,
    { id: channelId, input: { addWarehouses: [warehouseId] } }
  );
  if (d.channelUpdate.errors.length)
    throw new Error("channelUpdate error: " + JSON.stringify(d.channelUpdate.errors));
}

async function createShippingMethod(shippingZone) {
  if (CFG.dryRun) return "dry-run-method-id";
  const d = await gql(
    `mutation($input: ShippingPriceInput!) {
      shippingPriceCreate(input: $input) {
        shippingMethod { id name }
        errors { field message code }
      }
    }`,
    { input: { name: "Standard Shipping", type: "PRICE", shippingZone } }
  );
  if (d.shippingPriceCreate.errors.length)
    throw new Error("Create method error: " + JSON.stringify(d.shippingPriceCreate.errors));
  return d.shippingPriceCreate.shippingMethod.id;
}

async function setChannelPrice(methodId, channelId, price) {
  if (CFG.dryRun) return;
  const d = await gql(
    `mutation($id: ID!, $input: ShippingMethodChannelListingInput!) {
      shippingMethodChannelListingUpdate(id: $id, input: $input) {
        shippingMethod { id channelListings { channel { slug } price { amount } } }
        errors { field message code }
      }
    }`,
    {
      id: methodId,
      input: { addChannels: [{ channelId, price }] },
    }
  );
  if (d.shippingMethodChannelListingUpdate.errors.length)
    throw new Error("Set price error: " + JSON.stringify(d.shippingMethodChannelListingUpdate.errors));
  return d.shippingMethodChannelListingUpdate.shippingMethod;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nSaleor URL: ${CFG.saleorUrl}`);
  if (CFG.dryRun) console.log("DRY RUN — no mutations will run\n");

  // Authenticate
  if (!CFG.appToken) {
    console.log("No SALEOR_APP_TOKEN — logging in with staff credentials");
    await saleorLogin();
  } else {
    console.log("Using SALEOR_APP_TOKEN");
  }

  // Resolve channel
  console.log("\n[1/4] Resolving channel and warehouses...");
  const channel = await getChannel();
  console.log(`  Channel: ${channel.slug} (${channel.id})`);

  const warehouses = await getWarehouses();
  const defaultWh = warehouses.find((w) => w.name === "Default") ||
    warehouses.find((w) => w.clickAndCollectOption !== "DISABLED" && w.address?.country?.code !== "KE");
  if (!defaultWh) throw new Error("Could not find Default warehouse");
  console.log(`  Default warehouse: ${defaultWh.name} (${defaultWh.id})`);

  const keWh = warehouses.find(
    (w) => w.address?.country?.code === "KE" && w.clickAndCollectOption !== "DISABLED"
  );
  if (keWh) {
    console.log(`  KE click-and-collect warehouse: ${keWh.name} (${keWh.id})`);
    // Ensure KE click-and-collect warehouse is in default-channel so it appears
    // as a collection point at checkout. This is separate from shipping zone
    // warehouse assignments.
    console.log(`  Adding ${keWh.name} to ${CFG.channel}...`);
    await addWarehouseToChannel(channel.id, keWh.id);
  }

  // Delete existing zones
  console.log("\n[2/4] Deleting existing shipping zones...");
  const newZoneNames = new Set(ZONES.map((z) => z.name));
  const existing = await getExistingZones();
  if (existing.length === 0) {
    console.log("  No existing zones to delete");
  }
  for (const zone of existing) {
    if (newZoneNames.has(zone.name)) {
      console.log(`  Skipping "${zone.name}" — will be recreated`);
      await deleteZone(zone.id, zone.name);
    } else {
      await deleteZone(zone.id, zone.name);
    }
  }

  // Create zones
  console.log("\n[3/4] Creating shipping zones...");
  const results = [];
  for (const zone of ZONES) {
    console.log(`\n  Zone: ${zone.name} — $${zone.price} USD`);

    // Only use the Default warehouse for zone assignments. Click-and-collect
    // is handled via the channel-warehouse link added above, not via zones.
    const warehouseIds = [defaultWh.id];

    // Create zone with channel but WITHOUT warehouses — Saleor requires the
    // warehouse to already share a channel with the zone before it can be
    // assigned. Assign warehouses in a second pass via shippingZoneUpdate.
    const zoneInput = {
      name: zone.name,
      addChannels: [channel.id],
    };
    if (zone.default) {
      zoneInput.default = true;
    } else {
      zoneInput.countries = zone.countries;
    }

    const zoneId = await createZone(zoneInput);
    console.log(`    Created zone id: ${zoneId}`);

    // Now assign warehouses (zone + channel already linked above)
    await updateZoneWarehouses(zoneId, warehouseIds);
    console.log(`    Warehouses assigned: ${warehouseIds.length}`);

    const methodId = await createShippingMethod(zoneId);
    console.log(`    Created method id: ${methodId}`);

    const method = await setChannelPrice(methodId, channel.id, zone.price);
    const listing = method?.channelListings?.find((l) => l.channel.slug === CFG.channel);
    if (listing) {
      console.log(`    Price set: $${listing.price.amount} ${channel.slug}`);
    }

    results.push({ zone: zone.name, price: zone.price, countries: zone.countries.length });
  }

  // Summary
  console.log("\n[4/4] Summary");
  console.log("─".repeat(55));
  console.log("Zone                       Countries  Price (USD)");
  console.log("─".repeat(55));
  for (const r of results) {
    const countries = r.countries === 0 ? "all others" : `${r.countries} countries`;
    console.log(`${r.zone.padEnd(27)} ${countries.padEnd(11)} $${r.price}`);
  }
  console.log("─".repeat(55));
  console.log(`\nDone.${CFG.dryRun ? " (dry-run — nothing was written)" : ""}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
