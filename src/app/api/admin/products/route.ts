export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import "@/models/Category";
import { slugify, escapeRegExp } from "@/lib/helpers";
import { normalizeProductInput } from "@/lib/product-input";

function toTrimmedSlug(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 200);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const isActive = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.name = { $regex: escapeRegExp(search.slice(0, 64)), $options: "i" };
    }

    if (category) {
      filter.category = category;
    }

    // The admin UI sends "status"; older builds sent "isActive". Accept both
    // so the Active/Draft filter is never silently ignored.
    const statusFilter = searchParams.get("status");
    const activeFilter =
      statusFilter !== null && statusFilter !== undefined && statusFilter !== ""
        ? statusFilter
        : isActive;
    if (activeFilter !== null && activeFilter !== undefined && activeFilter !== "") {
      filter.isActive = activeFilter === "true";
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return NextResponse.json({
      products,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/admin/products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = (await request.json()) as Record<string, unknown>;
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    // Whitelist + validate instead of forwarding the raw body: this is what
    // keeps `variants[].mrp` from being stripped by Mongoose strict mode and
    // maps the form's `description` onto the `fullDescription` field.
    const doc = normalizeProductInput(body, { mode: "create" });
    if (!doc) {
      return NextResponse.json(
        { error: "Product name and at least one variant are required" },
        { status: 400 }
      );
    }

    if (typeof body.slug === "string" && body.slug.trim()) {
      doc.slug = toTrimmedSlug(body.slug);
    } else {
      doc.slug = slugify(String(name));
    }

    const existing = await Product.findOne({ slug: doc.slug as string });
    if (existing) {
      doc.slug = `${doc.slug}-${Date.now()}`;
    }

    const product = await Product.create(doc);

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/products error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
