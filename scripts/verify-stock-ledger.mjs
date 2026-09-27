/**
 * Verifies the MongoDB semantics the stock ledger depends on, against a
 * THROWAWAY database. It never reads or writes the application's data:
 * the database name is replaced with a scratch one and dropped at the end.
 *
 * Run with: node scripts/verify-stock-ledger.mjs
 *
 * Set LEDGER_CHECK_URI to override the connection (e.g. a local mongod):
 *   $env:LEDGER_CHECK_URI = "mongodb://localhost:27017"; node scripts/verify-stock-ledger.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const override = (process.env.LEDGER_CHECK_URI || "").trim();
let uri = override;
if (!uri) {
  const envPath = path.resolve(".env.local");
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*MONGODB_URI\s*=\s*(.+)\s*$/);
      if (m) uri = m[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* fall through */
  }
}
if (!uri && process.env.MONGODB_URI) uri = process.env.MONGODB_URI.trim();
if (!uri) {
  console.error("MONGODB_URI not found (.env.local or environment) — skipping.");
  process.exit(0);
}

const SCRATCH_DB = `crispo_ledger_check_${Date.now()}`;
const at = uri.lastIndexOf("/");
const queryAt = uri.indexOf("?", at);
const host = uri.slice(0, queryAt === -1 ? uri.length : queryAt);
const rest = queryAt === -1 ? "" : uri.slice(queryAt);
const appDb = decodeURIComponent(uri.slice(at + 1, queryAt === -1 ? uri.length : queryAt));
const scratchUri = `${host}/${SCRATCH_DB}${rest}`;

if (scratchUri === uri || SCRATCH_DB === appDb) {
  console.error("Refusing to run: scratch database name collision.");
  process.exit(1);
}
console.log(`Connected to : ${host.replace(/^mongodb(\+srv)?:\/\/[^@]*@/, "mongodb$1://***@")}`);
console.log(`Scratch used : ${SCRATCH_DB}  (discarded afterwards)\n`);

let failures = 0;
function check(name, condition, detail) {
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail !== undefined ? ` -> ${detail}` : ""}`);
  }
}

const db = mongoose.createConnection(scratchUri, { serverSelectionTimeoutMS: 15000 });
await db.asPromise();

try {
  const orders = db.collection("orders");
  const products = db.collection("products");
  const productId = new mongoose.Types.ObjectId();
  await products.insertOne({
    _id: productId,
    name: "Test Cookie",
    variants: [{ weight: "250g", stock: 5 }, { weight: "500g", stock: 1 }],
  });
  await orders.insertOne({
    orderId: "TEST-1",
    total: 100,
    items: [
      { productId: String(productId), variant: "250g", qty: 2 },
      { productId: String(productId), variant: "500g", qty: 1 },
    ],
    fulfillment: {},
  });

  const claim = (orderId, productIdStr, variant) =>
    orders.updateOne(
      { orderId, "fulfillment.stockLines": { $not: { $elemMatch: { productId: productIdStr, variant } } } },
      {
        $push: {
          "fulfillment.stockLines": {
            productId: productIdStr,
            variant,
            applied: false,
            shortfall: 0,
            settled: false,
          },
        },
      }
    );

  const settle = (orderId, productIdStr, variant, applied, shortfall) =>
    orders.updateOne(
      { orderId, "fulfillment.stockLines": { $elemMatch: { productId: productIdStr, variant } } },
      {
        $set: {
          "fulfillment.stockLines.$.applied": applied,
          "fulfillment.stockLines.$.shortfall": shortfall,
          "fulfillment.stockLines.$.settled": true,
        },
      }
    );

  const guardedDecrement = (qty) =>
    products.updateOne(
      { _id: productId, variants: { $elemMatch: { weight: "250g", stock: { $gte: qty } } } },
      { $inc: { "variants.$.stock": -qty } }
    );

  console.log("1. Claim is mutually exclusive (two concurrent runs, one winner)");
  {
    const [a, b] = await Promise.all([claim("TEST-1", String(productId), "250g"), claim("TEST-1", String(productId), "250g")]);
    const winners = [a, b].filter((r) => r.modifiedCount === 1).length;
    check("exactly one claim modified the order", winners === 1, `winners=${winners}`);
    const lines = (await orders.findOne({ orderId: "TEST-1" })).fulfillment.stockLines;
    check("only one line exists for the variant", lines.filter((l) => l.variant === "250g").length === 1, JSON.stringify(lines));
    check("the claim is stored unsettled", lines[0].settled === false, JSON.stringify(lines[0]));
  }

  console.log("\n2. A second claim for the same line is a no-op after settling");
  {
    await settle("TEST-1", String(productId), "250g", true, 0);
    const again = await claim("TEST-1", String(productId), "250g");
    check("no duplicate line is created", again.modifiedCount === 0, `modified=${again.modifiedCount}`);
    const lines = (await orders.findOne({ orderId: "TEST-1" })).fulfillment.stockLines;
    check("settle wrote applied=true via the positional operator", lines[0].applied === true && lines[0].settled === true, JSON.stringify(lines[0]));
  }

  console.log("\n3. The guarded decrement applies only when stock is sufficient");
  {
    const ok = await guardedDecrement(2);
    check("2 units available -> decrement applied", ok.modifiedCount === 1, `modified=${ok.modifiedCount}`);
    const after = await products.findOne({ _id: productId });
    check("250g stock is now 3", after.variants[0].stock === 3, `stock=${after.variants[0].stock}`);
  }

  console.log("\n4. The guard blocks an oversell and the retry cannot bypass it");
  {
    const tooMany = await guardedDecrement(99);
    check("oversell is refused", tooMany.modifiedCount === 0, `modified=${tooMany.modifiedCount}`);
    const after = await products.findOne({ _id: productId });
    check("stock is unchanged at 3", after.variants[0].stock === 3, `stock=${after.variants[0].stock}`);
    const boundary = await guardedDecrement(3);
    check("exactly 3 available -> allowed", boundary.modifiedCount === 1, `modified=${boundary.modifiedCount}`);
    const drained = await products.findOne({ _id: productId });
    check("stock floors at 0, never negative", drained.variants[0].stock === 0, `stock=${drained.variants[0].stock}`);
    const below = await guardedDecrement(1);
    check("further decrement is refused at 0", below.modifiedCount === 0, `modified=${below.modifiedCount}`);
  }

  console.log("\n5. A different variant on the same product is untouched");
  {
    const after = await products.findOne({ _id: productId });
    check("500g stock unchanged", after.variants[1].stock === 1, `stock=${after.variants[1].stock}`);
  }

  console.log("\n6. Claiming a second variant on the same order appends, not replaces");
  {
    const c = await claim("TEST-1", String(productId), "500g");
    check("claim applied", c.modifiedCount === 1, `modified=${c.modifiedCount}`);
    const lines = (await orders.findOne({ orderId: "TEST-1" })).fulfillment.stockLines;
    check("two lines now", lines.length === 2, JSON.stringify(lines.map((l) => l.variant)));
    check("the settled line kept its outcome", lines.find((l) => l.variant === "250g").settled === true);
    check("the new line is unsettled", lines.find((l) => l.variant === "500g").settled === false);
  }

  console.log("\n7. $not/$elemMatch still matches when the array field is missing");
  {
    await orders.insertOne({ orderId: "TEST-2", items: [], fulfillment: {} });
    const c = await claim("TEST-2", String(productId), "250g");
    check("claim works with no stockLines array", c.modifiedCount === 1, `modified=${c.modifiedCount}`);
  }

  console.log(failures === 0 ? "\nAll stock-ledger checks passed.\n" : `\n${failures} check(s) FAILED.\n`);
} finally {
  await db.dropDatabase();
  await db.close();
  console.log(`Scratch database dropped: ${SCRATCH_DB}`);
  process.exit(failures === 0 ? 0 : 1);
}
