export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import {
  getDelhiveryConfigStatus,
  getDelhiveryBaseUrl,
  getPickupLocation,
  getOriginPincode,
  getShippingMode,
} from "@/lib/delhivery";

const ORDER_STATUSES = [
  "processing",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await Order.findById(params.id).lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Map stored items (name/qty/price) to the shape the admin UI consumes.
    const items = (order.items || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any) => ({
        productName: item.name || "Product",
        image: item.image || "",
        variant: item.variant || "",
        quantity: item.qty ?? 0,
        price: item.price ?? 0,
      })
    );

    const config = getDelhiveryConfigStatus();

    return NextResponse.json({
      ...order,
      items,
      status:
        typeof order.orderStatus === "string"
          ? order.orderStatus.charAt(0).toUpperCase() +
            order.orderStatus.slice(1)
          : order.orderStatus,
      // Non-secret environment-derived shipping info for the delivery panel.
      delhiveryEnv: {
        configured: config.configured,
        pickupLocationConfigured: config.pickupLocationConfigured,
        pickupLocation: config.pickupLocationConfigured
          ? getPickupLocation()
          : null,
        originPincodeConfigured: config.originPincodeConfigured,
        originPincode: config.originPincodeConfigured
          ? getOriginPincode()
          : null,
        baseUrl: getDelhiveryBaseUrl(),
        shippingMode: getShippingMode() === "E" ? "Express" : "Surface",
      },
    });
  } catch (error) {
    console.error("GET /api/admin/orders/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

/** Whitelisted pre-manifest editable shipping/package fields. */
interface EditableShippingFields {
  customerName?: string;
  phone?: string;
  email?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  shipmentWeightOverrideGrams?: number | string | null;
  packageDescription?: string;
  packageDimensions?: {
    lengthCm?: number | null;
    breadthCm?: number | null;
    heightCm?: number | null;
  };
  /** "S" Surface / "E" Express; only settable before a shipment exists. */
  shippingMode?: "S" | "E";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const order = await Order.findById(params.id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    // -----------------------------------------------------------------
    // Order status (payment status vs shipment status stay separate).
    // "shipped"/"delivered" are Delhivery-observed facts — they can only be
    // set here when a real waybill exists (tracking remains authoritative).
    // -----------------------------------------------------------------
    if (typeof body.status === "string") {
      const next = body.status.toLowerCase();
      if (!(ORDER_STATUSES as readonly string[]).includes(next)) {
        return NextResponse.json(
          { error: "Invalid order status" },
          { status: 400 }
        );
      }
      if ((next === "shipped" || next === "delivered") && !order.waybill) {
        return NextResponse.json(
          {
            error:
              "Order has no Delhivery shipment yet. Create the shipment first — status will then update from real tracking.",
            code: "SHIPMENT_REQUIRED",
            role: "orderStatus",
          },
          { status: 409 }
        );
      }
      order.orderStatus = next as (typeof ORDER_STATUSES)[number];
    }

    // -----------------------------------------------------------------
    // Editable customer/shipping/package fields. Everything that affects a
    // Delhivery shipment is locked once a waybill exists (Delhivery holds an
    // immutable copy for that AWB). Local-only package metadata stays
    // editable after manifest, but never pretends Delhivery was updated.
    // -----------------------------------------------------------------
    const manifestLocked = Boolean(order.waybill);
    const edited = body as EditableShippingFields;

    const proposed: Record<string, unknown> = {};

    if (edited.customerName !== undefined) {
      const name = String(edited.customerName ?? "").trim();
      if (!name) {
        return NextResponse.json(
          { error: "Customer name is required", role: "customerName" },
          { status: 400 }
        );
      }
      proposed.customerName = name;
    }
    if (edited.phone !== undefined) {
      const phone = String(edited.phone ?? "").trim();
      if (!/^[0-9+\- ]{7,15}$/.test(phone)) {
        return NextResponse.json(
          { error: "Invalid phone number", role: "phone" },
          { status: 400 }
        );
      }
      proposed.phone = phone;
    }
    if (edited.email !== undefined) {
      const email = String(edited.email ?? "").trim();
      if (email && !/\S+@\S+\.\S+/.test(email)) {
        return NextResponse.json(
          { error: "Invalid email", role: "email" },
          { status: 400 }
        );
      }
      proposed.email = email;
    }
    if (edited.address !== undefined && typeof edited.address === "object") {
      const a = edited.address || {};
      const address = {
        line1: String(a.line1 ?? "").trim(),
        line2: String(a.line2 ?? "").trim(),
        city: String(a.city ?? "").trim(),
        state: String(a.state ?? "").trim(),
        pincode: String(a.pincode ?? "").trim(),
      };
      if (
        !address.line1 ||
        !address.city ||
        !address.state ||
        !/^\d{6}$/.test(address.pincode)
      ) {
        return NextResponse.json(
          {
            error: "Address needs line 1, city, state and a valid 6-digit pincode",
            role: "address",
          },
          { status: 400 }
        );
      }
      if (manifestLocked && address.pincode !== order.address?.pincode) {
        return NextResponse.json(
          {
            error:
              "Address is locked because this order is already manifested with Delhivery. A changed pincode there requires a Delhivery update API — not implemented, so the address cannot be edited safely.",
            code: "MANIFEST_LOCKED",
            role: "address",
          },
          { status: 409 }
        );
      }
      proposed.address = address;
    }

    if (edited.shipmentWeightOverrideGrams !== undefined) {
      const raw = edited.shipmentWeightOverrideGrams;
      if (raw === null || raw === "") {
        proposed.shipmentWeightOverrideGrams = null;
      } else {
        const grams = Number(raw);
        if (!Number.isFinite(grams) || grams <= 0 || grams > 50000) {
          return NextResponse.json(
            { error: "Package weight must be between 1 and 50000 grams" },
            { status: 400 }
          );
        }
        proposed.shipmentWeightOverrideGrams = Math.round(grams);
      }
    }
    if (edited.packageDescription !== undefined) {
      proposed.packageDescription = String(edited.packageDescription ?? "").slice(
        0,
        300
      );
    }
    if (edited.packageDimensions !== undefined && edited.packageDimensions) {
      const d = edited.packageDimensions;
      const num = (v: unknown): number | undefined => {
        if (v === null || v === undefined || v === "") return undefined;
        const n = Number(v);
        return Number.isFinite(n) && n > 0 && n <= 200 ? n : undefined;
      };
      proposed.packageDimensions = {
        lengthCm: num(d.lengthCm),
        breadthCm: num(d.breadthCm),
        heightCm: num(d.heightCm),
      };
    }
    if (edited.shippingMode !== undefined) {
      const mode = String(edited.shippingMode).toUpperCase();
      if (mode !== "S" && mode !== "E") {
        return NextResponse.json(
          { error: "Shipping mode must be S (Surface) or E (Express)" },
          { status: 400 }
        );
      }
      proposed.shippingModeOverride = mode as "S" | "E";
    }

    // Shipment-affecting edits (customer, phone, weight) are locked post-manifest.
    if (manifestLocked) {
      const affected = [
        "customerName",
        "phone",
        "email",
        "shippingModeOverride",
        "shipmentWeightOverrideGrams",
      ].filter((k) => k in proposed);
      if (affected.length > 0) {
        return NextResponse.json(
          {
            error:
              "This order is already manifested with Delhivery. Customer, phone, email, shipping mode and package weight are locked (Delhivery holds the original); only package description and dimensions can still be edited locally.",
            code: "MANIFEST_LOCKED",
            role: "manifest",
          },
          { status: 409 }
        );
      }
    }

    for (const [key, value] of Object.entries(proposed)) {
      order.set(key, value);
    }

    if (Object.keys(proposed).length > 0 || typeof body.status === "string") {
      await order.save();
    }

    return NextResponse.json({
      ...order.toObject(),
      status:
        typeof order.orderStatus === "string"
          ? order.orderStatus.charAt(0).toUpperCase() +
            order.orderStatus.slice(1)
          : order.orderStatus,
      orderStatus: order.orderStatus,
    });
  } catch (error) {
    console.error("PATCH /api/admin/orders/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}