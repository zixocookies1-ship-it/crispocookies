export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { slugify } from "@/lib/helpers";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const categories = await Category.find().sort({ createdAt: -1 }).lean();

    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({
          category: cat._id,
        });
        return { ...cat, productCount };
      })
    );

    return NextResponse.json(categoriesWithCount);
  } catch (error) {
    console.error("GET /api/admin/categories error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
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

    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    let slug = slugify(name);
    const existing = await Category.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const category = await Category.create({ name, slug });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/categories error:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
