/**
 * Delhivery One direct API — response types.
 * Field casing follows the current official API (track.delhivery.com).
 */

export interface DelhiveryServiceabilityResponse {
  delivery_codes?: Array<{
    postal_code?: {
      pin?: number;
      pre_paid?: string;
      cash?: string;
      cod?: string;
      pickup?: string;
      repl?: string;
      state_code?: string;
      city?: string;
      district?: string;
      country_code?: string;
      is_oda?: string;
      remarks?: string;
    };
  }>;
}

export interface DelhiveryRateItem {
  gross_amount?: number;
  total_amount?: number;
  charge_DL?: number;
  charged_weight?: number;
  wt_rule_id?: string;
  zone?: string;
}

export interface DelhiveryRatesResponse {
  amount_due?: number;
  quote?: DelhiveryRateItem[];
  return_?: unknown;
  packages?: Array<{ total_amount?: number }>;
}

export interface DelhiveryShipmentRequest {
  name: string;
  add: string;
  pin: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  order: string;
  order_date: string;
  payment_mode: "Prepaid";
  shipping_mode?: "Surface" | "Express";
  weight: string;
  quantity: string;
  total_amount: string;
  products_desc: string;
  fragile_shipment?: string;
  plastic_packaging?: string;
  shipment_length?: string;
  shipment_width?: string;
  shipment_height?: string;
  seller_gst_tin?: string;
  hsn_code?: string;
  tax_value?: string;
}

export interface DelhiveryShipmentPackage {
  waybill?: string;
  refnum?: string;
  status?: string;
  cod_amount?: number;
  payment?: string;
}

export interface DelhiveryShipmentResponse {
  success?: boolean;
  package_count?: number;
  prepaid_count?: number;
  cod_count?: number;
  packages?: DelhiveryShipmentPackage[];
  upload_wbn?: string;
}

export interface DelhiveryPickupResponse {
  pickup_id?: number;
  pickup_location_name?: string;
  pickup_date?: string;
  pickup_time?: string;
}

export interface DelhiveryScan {
  ScanDateTime?: string;
  ScanType?: string;
  Scan?: string;
  ScannedLocation?: string;
  StatusCode?: unknown;
}

export interface DelhiveryTrackResponse {
  ShipmentData?: Array<{
    Shipment?: {
      AWB?: string;
      ReferenceNo?: string;
      OrderType?: string;
      Status?: {
        Status?: string;
        StatusType?: string;
        StatusLocation?: string;
        StatusDateTime?: string;
        Instruction?: string;
      };
      Scans?: Array<{ ScanDetail?: DelhiveryScan }>;
    };
  }>;
}