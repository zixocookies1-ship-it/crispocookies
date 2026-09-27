/**
 * Shared whitelisting + validation for admin product writes.
 *
 * Both the create (POST /api/admin/products) and update (PUT
 * /api/admin/products/[id]) routes used to forward the raw request body
 * straight into Mongoose. That:
 *   - let Mongoose strict mode silently drop `variants[].mrp` (so MRP
 *     strikethroughs disappeared and the discount base changed),
 *   - dropped the `description` key the admin form actually sends, because the
 *     schema stores it as `fullDescription`,
 *   - wrote an entire replacement `variants` array, so a payload that omitted
 *     `mrp` or the shipping weight wiped the stored values,
 *   - and allowed arbitrary fields to be written.
 */

export const MAX_VARIANTS = 20;
export const MAX_IMAGES = 10;

export type StoredVariant = {
  weight?: string;
  price?: number;
  mrp?: number;
  stock?: number;
  shippingWeightGrams?: number;
};

function toTrimmedString(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function toWholeNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

/**
 * Normalize a product variant.
 *
 * `previous` is the variant already stored under the same weight. Any field the
 * client omitted keeps the stored value instead of being cleared.
 */
export function normalizeVariant(
  raw: unknown,
  previous?: StoredVariant
): Record<string, unknown> | null {
  const v = (raw ?? {}) as Record<string, unknown>;
  const weight = toTrimmedString(v.weight, 60);
  if (!weight) return null;

  const price = toWholeNumber(v.price, 0);
  const mrpRaw = v.mrp;
  const hasMrp = mrpRaw !== undefined && mrpRaw !== null && mrpRaw !== "";

  const variant: Record<string, unknown> = {
    weight,
    price,
    stock: toWholeNumber(v.stock, toWholeNumber(previous?.stock, 0)),
    shippingWeightGrams: toWholeNumber(
      v.shippingWeightGrams,
      toWholeNumber(previous?.shippingWeightGrams, 0)
    ),
  };

  if (hasMrp) {
    const mrp = toWholeNumber(mrpRaw, 0);
    // The MRP is the reference a "% off" offer is calculated from, so it can
    // never be lower than the selling price.
    if (mrp > 0) variant.mrp = mrp;
  } else if (typeof previous?.mrp === "number" && previous.mrp > 0) {
    variant.mrp = Math.round(previous.mrp);
  }

  return variant;
}

/**
 * Build a sanitized product document/update from an admin payload.
 *
 * Returns `null` when nothing usable was supplied. `mode` differs only in
 * which fields are required: a create must have a name, an update can be a
 * partial patch.
 */
export function normalizeProductInput(
  body: Record<string, unknown>,
  opts: {
    mode: "create" | "update";
    existingVariants?: StoredVariant[];
  }
): Record<string, unknown> | null {
  const doc: Record<string, unknown> = {};
  let touched = false;

  if (typeof body.name === "string" && body.name.trim()) {
    doc.name = toTrimmedString(body.name, 200);
    touched = true;
  } else if (opts.mode === "create") {
    return null;
  }

  if (typeof body.slug === "string" && body.slug.trim()) {
    doc.slug = toTrimmedString(body.slug, 200).toLowerCase();
    touched = true;
  }
  if (typeof body.shortDescription === "string") {
    doc.shortDescription = toTrimmedString(body.shortDescription, 150);
    touched = true;
  }
  // The admin form sends `description`; the schema field is `fullDescription`.
  const description =
    typeof body.description === "string"
      ? body.description
      : body.fullDescription;
  if (typeof description === "string") {
    doc.fullDescription = toTrimmedString(description, 5000);
    touched = true;
  }
  if (typeof body.ingredients === "string") {
    doc.ingredients = toTrimmedString(body.ingredients, 2000);
    touched = true;
  }
  if (Array.isArray(body.images)) {
    doc.images = body.images
      .map((img) => toTrimmedString(img, 500))
      .filter(Boolean)
      .slice(0, MAX_IMAGES);
    touched = true;
  }
  if (Array.isArray(body.tags)) {
    doc.tags = body.tags
      .map((tag) => toTrimmedString(tag, 50))
      .filter(Boolean)
      .slice(0, 20);
    touched = true;
  }
  if (typeof body.category === "string" && body.category.trim()) {
    doc.category = toTrimmedString(body.category, 60);
    touched = true;
  }
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    doc.sortOrder = Math.round(body.sortOrder);
    touched = true;
  }
  if (typeof body.isActive === "boolean") {
    doc.isActive = body.isActive;
    touched = true;
  }

  if (Array.isArray(body.variants)) {
    // Merge against the stored variants, keyed by weight, so a payload that
    // omits `mrp` (or the shipping weight) keeps what is already in the DB.
    const existingByWeight = new Map(
      (opts.existingVariants ?? [])
        .filter((v) => typeof v?.weight === "string")
        .map((v) => [v.weight as string, v])
    );

    const variants = body.variants
      .slice(0, MAX_VARIANTS)
      .map((raw) => {
        const weight = toTrimmedString(
          (raw ?? {}) as Record<string, unknown> | null
            ? ((raw as Record<string, unknown>).weight ?? "")
            : "",
          60
        );
        return normalizeVariant(raw, weight ? existingByWeight.get(weight) : undefined);
      })
      .filter((v): v is Record<string, unknown> => Boolean(v));

    if (variants.length > 0) {
      doc.variants = variants;
      touched = true;
    } else if (opts.mode === "create") {
      return null;
    }
  } else if (opts.mode === "create") {
    return null;
  }

  return touched ? doc : null;
}
