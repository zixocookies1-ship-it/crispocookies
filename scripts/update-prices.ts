/**
 * Update cookie MRP/selling prices and the flat delivery charge.
 * Usage:  npx tsx scripts/update-prices.ts
 */
import fs from "fs";
import path from "path";
import dns from "dns";
import mongoose from "mongoose";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) process.exit(1);
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function makeDirectUri(srvUri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const resolver = new dns.Resolver();
    resolver.setServers(["1.1.1.1", "8.8.8.8"]);
    const afterScheme = srvUri.split("://")[1];
    const slashIdx = afterScheme.indexOf("/");
    const authority = slashIdx === -1 ? afterScheme : afterScheme.slice(0, slashIdx);
    const rest = slashIdx === -1 ? "" : afterScheme.slice(slashIdx + 1);
    const at = authority.lastIndexOf("@");
    const auth = at === -1 ? "" : authority.slice(0, at);
    const host = at === -1 ? authority : authority.slice(at + 1);
    resolver.resolveSrv(`_mongodb._tcp.${host}`, (err, records) => {
      if (err || !records || !records.length) {
        reject(err || new Error("No SRV records"));
        return;
      }
      const seeds = records.map((r) => `${r.name}:${r.port}`).join(",");
      const dbName = rest.split("?")[0];
      resolve(
        `mongodb://${auth}@${seeds}/${dbName}?ssl=true&authSource=admin&appName=crispo-cli`
      );
    });
  });
}

const PRICE_UPDATES: Record<string, { mrp: number; price: number }> = {
  "rose-cookie": { mrp: 399, price: 249 },
  "pineapple-cookie": { mrp: 399, price: 249 },
  "all-mix-cookies": { mrp: 299, price: 199 },
  "double-chocolate-cookie": { mrp: 399, price: 249 },
  "dry-seeds-cookie": { mrp: 399, price: 249 },
};

async function main() {
  loadEnvLocal();
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }
  const directUri = await makeDirectUri(MONGODB_URI);
  await mongoose.connect(directUri);

  const ProductSchema = new mongoose.Schema(
    {
      name: String,
      slug: String,
      variants: [
        {
          weight: String,
          price: Number,
          mrp: Number,
          stock: Number,
        },
      ],
    },
    { collection: "products" }
  );
  const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);

  let updated = 0;
  for (const [slug, price] of Object.entries(PRICE_UPDATES)) {
    const doc = await Product.findOne({ slug }).lean();
    if (!doc) {
      console.warn(`NOT FOUND: ${slug}`);
      continue;
    }
    const set: Record<string, number> = {};
    (doc.variants as Array<{ weight: string }>).forEach((v, i) => {
      set[`variants.${i}.mrp`] = price.mrp;
      set[`variants.${i}.price`] = price.price;
    });
    if (Object.keys(set).length === 0) {
      console.warn(`NO VARIANTS: ${slug}`);
      continue;
    }
    await Product.updateOne({ slug }, { $set: set });
    console.log(
      `Updated ${(doc as { name: string }).name} (${slug}): mrp=₹${price.mrp} price=₹${price.price}`
    );
    updated++;
  }

  const SettingsSchema = new mongoose.Schema(
    { freeDeliveryAbove: Number, deliveryCharge: Number },
    { collection: "settings" }
  );
  const Settings = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);
  await Settings.updateOne({}, { $set: { deliveryCharge: 40 } });
  console.log("Updated Settings.deliveryCharge = 40");

  console.log(`Done. ${updated}/${Object.keys(PRICE_UPDATES).length} products updated.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});