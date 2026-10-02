/**
 * Verifies the Delhivery sync guards against a THROWAWAY database: the atomic
 * "syncing" claim that makes shipment creation idempotent, the stale-claim
 * takeover, and the retry filters used by the cron / batch sync / diagnostics.
 *
 * It never reads or writes application data — the database name is replaced
 * with a scratch one and dropped at the end.
 *
 * Run with: node scripts/verify-delhivery-sync.mjs
 *
 * Set LEDGER_CHECK_URI to override the connection (e.g. a local mongod):
 *   $env:LEDGER_CHECK_URI = "mongodb://localhost:27017"; node scripts/verify-delhivery-sync.mjs
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

const SCRATCH_DB = `crispo_delhivery_check_${Date.now()}`;
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

const STALE_SYNCING_MS = 2 * 60 * 1000;

/** Exactly the filter attemptAutoShipment uses before calling Delhivery. */
function claimFilter(now = Date.now()) {
  return {
    waybill: null,
    paymentStatus: "paid",
    $or: [
      { syncState: { $ne: "syncing" } },
      {
        syncState: "syncing",
        syncAttemptedAt: { $lt: new Date(now - STALE_SYNCING_MS) },
      },
    ],
  };
}

/** Exactly the candidate filter the daily cron uses. */
function cronFilter(retryBefore) {
  return {
    $and: [
      { paymentStatus: "paid" },
      { orderStatus: { $ne: "cancelled" } },
      { waybill: null },
      { $or: [{ syncState: { $ne: "synced" } }, { syncState: { $exists: false } }] },
      { $or: [{ syncRetryable: { $ne: false } }, { syncRetryable: { $exists: false } }] },
      {
        $or: [
          { syncAttemptedAt: { $exists: false } },
          { syncAttemptedAt: { $lt: retryBefore } },
        ],
      },
    ],
  };
}

const db = mongoose.createConnection(scratchUri, { serverSelectionTimeoutMS: 15000 });
await db.asPromise();
const coll = db.collection("orders");

async function insert(doc) {
  const base = {
    paymentStatus: "paid",
    orderStatus: "confirmed",
    createdAt: new Date(),
    syncState: "pending",
    syncRetryCount: 0,
    syncRetryable: true,
  };
  const res = await coll.insertOne({ ...base, ...doc });
  return res.insertedId;
}

try {
  // ------------------------------------------------------------------
  console.log("1. Only ONE concurrent caller may take the claim");
  // ------------------------------------------------------------------
  const a = await insert({ orderId: "D-1" });
  const [c1, c2] = await Promise.all([
    coll.updateOne(claimFilter(), { $set: { syncState: "syncing", syncAttemptedAt: new Date() } }),
    coll.updateOne(claimFilter(), { $set: { syncState: "syncing", syncAttemptedAt: new Date() } }),
  ]);
  const winners = [c1, c2].filter((r) => r.matchedCount === 1).length;
  check("exactly one update matched", winners === 1, `matched=${winners}`);
  check(
    "order is left in the syncing state",
    (await coll.findOne({ _id: a })).syncState === "syncing"
  );

  // ------------------------------------------------------------------
  console.log("\n2. A second claim on the same order is refused while it is live");
  // ------------------------------------------------------------------
  const c3 = await coll.updateOne(claimFilter(), {
    $set: { syncState: "syncing", syncAttemptedAt: new Date() },
  });
  check("live claim is not stolen", c3.matchedCount === 0, `matched=${c3.matchedCount}`);

  // ------------------------------------------------------------------
  console.log("\n3. A claim abandoned by a killed process is reclaimable");
  // ------------------------------------------------------------------
  await coll.updateOne(
    { _id: a },
    { $set: { syncAttemptedAt: new Date(Date.now() - STALE_SYNCING_MS - 1000) } }
  );
  const reclaimed = await coll.updateOne(claimFilter(), {
    $set: { syncState: "syncing", syncAttemptedAt: new Date() },
  });
  check("stale claim is taken over", reclaimed.matchedCount === 1);

  // ------------------------------------------------------------------
  console.log("\n4. An order that already has a waybill can never be claimed");
  // ------------------------------------------------------------------
  const b = await insert({ orderId: "D-2", waybill: "DL1234567890", syncState: "synced" });
  const c5 = await coll.updateOne(
    { ...claimFilter(), _id: b },
    { $set: { syncState: "syncing", syncAttemptedAt: new Date() } }
  );
  check("the shipped order specifically is untouched", c5.matchedCount === 0);
  check(
    "its syncState is still synced",
    (await coll.findOne({ _id: b })).syncState === "synced"
  );

  // ------------------------------------------------------------------
  console.log("\n5. Unpaid / cancelled orders are never claimed");
  // ------------------------------------------------------------------
  const pending = await insert({ orderId: "D-3", paymentStatus: "pending" });
  const c7 = await coll.updateOne({ ...claimFilter(), _id: pending }, { $set: { syncState: "syncing" } });
  check("the pending-payment order is refused", c7.matchedCount === 0);
  const cancelled = await insert({ orderId: "D-4", orderStatus: "cancelled" });
  const cronNow = new Date(Date.now() - 30 * 60 * 1000);
  const inCron = await coll.findOne({ ...cronFilter(cronNow), _id: cancelled });
  check("a cancelled order is not a cron candidate", inCron === null);

  // ------------------------------------------------------------------
  console.log("\n6. The cron leaves validation failures alone (syncRetryable=false)");
  // ------------------------------------------------------------------
  await insert({
    orderId: "D-5",
    syncState: "failed",
    syncRetryable: false,
    syncAttemptedAt: new Date(Date.now() - 60 * 60 * 1000),
    shipmentError: "Delhivery rejected the shipment: bad pincode",
  });  const retryable = await insert({
    orderId: "D-6",
    syncState: "failed",
    syncRetryable: true,
    syncAttemptedAt: new Date(Date.now() - 60 * 60 * 1000),
    shipmentError: "Delhivery API request timed out",
  });
  await insert({ orderId: "D-7" });
  const candidates = await coll
    .find(cronFilter(new Date(Date.now() - 30 * 60 * 1000)))
    .toArray();
  const ids = candidates.map((o) => o.orderId);
  check("the transient failure IS retried", ids.includes("D-6"), JSON.stringify(ids));
  check("an untried order IS retried", ids.includes("D-7"), JSON.stringify(ids));
  check("the validation failure is EXCLUDED", !ids.includes("D-5"), JSON.stringify(ids));

  // ------------------------------------------------------------------
  console.log("\n7. The admin batch sync CAN still pick up the blocked order");
  // ------------------------------------------------------------------
  const batch = await coll
    .find({ paymentStatus: "paid", orderStatus: { $ne: "cancelled" }, waybill: null })
    .toArray();
  const batchIds = batch.map((o) => o.orderId);
  check("blocked order is included when the admin forces it", batchIds.includes("D-5"));
  check("already-shipped D-2 is excluded", !batchIds.includes("D-2"));

  // ------------------------------------------------------------------
  console.log("\n8. Diagnostics counts distinguish waiting / blocked / shipped");
  // ------------------------------------------------------------------
  const pendingFilter = { paymentStatus: "paid", orderStatus: { $ne: "cancelled" }, waybill: null };
  const awaiting = await coll.countDocuments(pendingFilter);
  const needsAttention = await coll.countDocuments({ ...pendingFilter, syncRetryable: false });
  const shipped = await coll.countDocuments({ paymentStatus: "paid", waybill: { $ne: null } });
  check("awaiting counts every paid order without an AWB", awaiting >= 3, awaiting);
  check("needsAttention counts exactly the blocked one", needsAttention === 1, needsAttention);
  check("shipped counts the waybill we already had", shipped === 1, shipped);
} finally {
  await db.dropDatabase();
  await db.close();
}

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) FAILED.`);
  process.exit(1);
}
console.log("All Delhivery sync-guard checks passed.");
console.log("Scratch database dropped:", SCRATCH_DB);
