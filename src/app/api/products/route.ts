export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const tag = searchParams.get("tag");
    const sort = searchParams.get("sort");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (tag) {
      filter.tags = tag;
    }

    if (minPrice || maxPrice) {
      filter.variants = { $elemMatch: {} };
      const variantFilter: Record<string, number> = {};
      if (minPrice) variantFilter.$gte = parseFloat(minPrice);
      if (maxPrice) variantFilter.$lte = parseFloat(maxPrice);
      (filter.variants as Record<string, unknown>) = {
        $elemMatch: { price: variantFilter },
      };
    }

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === "popular") sortOption = { createdAt: -1 };
    else if (sort === "newest") sortOption = { createdAt: -1 };
    else if (sort === "price-asc") sortOption = { "variants.0.price": 1 };
    else if (sort === "price-desc") sortOption = { "variants.0.price": -1 };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .sort(sortOption)
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
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
