export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Notification from "@/models/Notification";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("GET /api/admin/notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
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

    const body = await request.json();
    const { message, type, orderId } = body;

    if (!message || !type) {
      return NextResponse.json(
        { error: "Message and type are required" },
        { status: 400 }
      );
    }

    const notification = await Notification.create({
      message,
      type,
      orderId: orderId || "",
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/notifications error:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}
