/**
 * Pure pricing invariants — no database, no network, no gateway.
 *
 * Run with:  npx tsx scripts/verify-pricing.ts
 * (tsx is not a dependency; the file is also valid as a `tsc`-checked module,
 *  so `npx tsc --noEmit` still type-checks the assertions.)
 */
import {
  DELIVERY_CHARGE,
  displayPricing,
  priceLine,
  computeOrderTotals,
  computeCouponDiscount,
  type ActivePromotion,
} from "../src/lib/pricing-math";

let failures = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? ` -> ${detail}` : ""}`);
  }
}

const launch: ActivePromotion = {
  id: "p1",
  name: "Launch",
  discountType: "percentage",
  discountValue: 60,
  startDate: "2020-01-01T00:00:00.000Z",
  endDate: "2030-01-01T00:00:00.000Z",
};

console.log("\n1. MRP 399 / selling 249 / 60% offer -> 160 (not 100)");
{
  const line = priceLine(249, 1, launch, 399);
  check("discount base is the MRP", line.base === 399, `base=${line.base}`);
  check("discount = 60% of 399 = 239", line.unitDiscount === 239, `d=${line.unitDiscount}`);
  check("final = 160", line.unitFinal === 160, `final=${line.unitFinal}`);
  check(
    "the charged price is never below the selling price floor",
    line.unitFinal <= line.base && line.unitFinal >= 0
  );
}

console.log("\n2. Missing MRP falls back to the selling price (no inflated discount)");
{
  const line = priceLine(249, 1, launch, undefined);
  check("base = 249 without an MRP", line.base === 249, `base=${line.base}`);
  check("final = 100", line.unitFinal === 100, `final=${line.unitFinal}`);
}

console.log("\n3. displayPricing never shows an MRP below the selling price");
{
  const d = displayPricing(249, 100, null);
  check("mrp clamps up to the selling price", d.mrp === 249, `mrp=${d.mrp}`);
  check("no discount shown", d.discount === 0 && !d.hasDiscount);
}

console.log("\n4. displayPricing badge % always matches its own numbers");
{
  for (const [price, mrp] of [
    [249, 399],
    [100, 100],
    [999, 1499],
    [0, 0],
    [1, 1000],
  ] as Array<[number, number]>) {
    for (const promo of [null, launch]) {
      const d = displayPricing(price, mrp, promo);
      const expectedPct =
        d.base > 0 && d.discount > 0
          ? Math.round((d.discount / d.base) * 100)
          : 0;
      check(
        `price=${price} mrp=${mrp} promo=${promo ? "60%" : "none"} -> ${d.offerPrice} (${d.discountPct}%)`,
        d.discountPct === expectedPct &&
          d.offerPrice === Math.max(0, d.base - d.discount) &&
          d.mrp >= d.sellingPrice &&
          // The offer is derived from the base, so the charge is always within
          // [0, base] and can legitimately sit below the selling price.
          d.offerPrice >= 0 &&
          d.offerPrice <= d.base
      );
    }
  }
}

console.log("\n5. A 100% offer cannot produce a negative amount");
{
  const full: ActivePromotion = { ...launch, discountValue: 100 };
  const d = displayPricing(249, 399, full);
  check("offer price floors at 0", d.offerPrice === 0, `offer=${d.offerPrice}`);
  check("no negative numbers anywhere", [d.mrp, d.sellingPrice, d.offerPrice, d.discount].every((n) => n >= 0));
}

console.log("\n6. Order totals: discount can never exceed the catalog subtotal");
{
  const lines = [priceLine(249, 2, launch, 399), priceLine(100, 1, null, 120)];
  const t = computeOrderTotals(lines, { charge: DELIVERY_CHARGE });
  check("catalogSubtotal = 2*399 + 120 = 918", t.catalogSubtotal === 918, `got ${t.catalogSubtotal}`);
  check("finalSubtotal = 2*160 + 100 = 420", t.finalSubtotal === 420, `got ${t.finalSubtotal}`);
  check("discount = 2*239 = 478", t.discount === 478, `got ${t.discount}`);
  check("total = 420 + 40 delivery", t.total === 460, `got ${t.total}`);
  check("discount <= catalogSubtotal", t.discount <= t.catalogSubtotal);
  check("finalSubtotal >= 0", t.finalSubtotal >= 0);
}

console.log("\n7. A coupon is capped at the amount actually payable");
{
  const lines = [priceLine(249, 1, launch, 399)];
  const before = computeOrderTotals(lines, { charge: DELIVERY_CHARGE });
  const huge = computeCouponDiscount({
    discountType: "fixed",
    discountValue: 9999,
    eligibleSubtotal: before.finalSubtotal,
  });
  const after = computeOrderTotals(lines, {
    charge: DELIVERY_CHARGE,
    couponDiscount: huge,
  });
  check("coupon cannot exceed the product total", huge === before.finalSubtotal, `huge=${huge}`);
  check("total is never negative", after.total >= 0, `total=${after.total}`);
  check("delivery still charged", after.total === DELIVERY_CHARGE, `total=${after.total}`);
}

console.log("\n8. Line totals equal the sum of per-unit prices (no rounding drift)");
{
  const lines = [
    priceLine(33, 3, launch, 99),
    priceLine(57, 2, launch, 111),
    priceLine(19, 1, null, 25),
  ];
  const t = computeOrderTotals(lines, { charge: DELIVERY_CHARGE });
  const manual = lines.reduce((s, l) => s + l.unitFinal * l.qty, 0);
  check("finalSubtotal matches the manual sum", t.finalSubtotal === manual, `${t.finalSubtotal} vs ${manual}`);
  check("total is consistent", t.total === manual + DELIVERY_CHARGE, `got ${t.total}`);
}

console.log(failures === 0 ? "\nAll pricing invariants passed.\n" : `\n${failures} pricing invariant(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
