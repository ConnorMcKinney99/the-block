export type TitleStatus = "clean" | "rebuilt" | "salvage";

export interface VehicleRecord {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  body_style: string;
  exterior_color: string;
  interior_color: string;
  engine: string;
  transmission: string;
  drivetrain: string;
  odometer_km: number;
  fuel_type: string;
  condition_grade: number;
  condition_report: string;
  damage_notes: string[];
  title_status: TitleStatus;
  province: string;
  city: string;
  auction_start: string;
  starting_bid: number;
  reserve_price: number | null;
  buy_now_price: number | null;
  images: string[];
  selling_dealership: string;
  lot: string;
  current_bid: number | null;
  bid_count: number;
}

export interface Vehicle {
  readonly id: string;
  readonly vin: string;
  readonly year: number;
  readonly make: string;
  readonly model: string;
  readonly trim: string;
  readonly bodyStyle: string;
  readonly exteriorColor: string;
  readonly interiorColor: string;
  readonly engine: string;
  readonly transmission: string;
  readonly drivetrain: string;
  readonly odometerKm: number;
  readonly fuelType: string;
  readonly conditionGrade: number;
  readonly conditionReport: string;
  readonly damageNotes: readonly string[];
  readonly titleStatus: TitleStatus;
  readonly province: string;
  readonly city: string;
  readonly auctionStart: string;
  readonly startingBid: number;
  readonly reservePrice: number | null;
  readonly buyNowPrice: number | null;
  readonly images: readonly string[];
  readonly sellingDealership: string;
  readonly lot: string;
  readonly currentBid: number | null;
  readonly bidCount: number;
}
