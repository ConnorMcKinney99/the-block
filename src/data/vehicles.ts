import vehicleJson from "../../data/vehicles.json" with { type: "json" };
import type { Vehicle, VehicleRecord } from "../domain/vehicle/types";

const vehicleRecords = vehicleJson as VehicleRecord[];

function toVehicle(record: VehicleRecord): Vehicle {
  return Object.freeze({
    id: record.id,
    vin: record.vin,
    year: record.year,
    make: record.make,
    model: record.model,
    trim: record.trim,
    bodyStyle: record.body_style,
    exteriorColor: record.exterior_color,
    interiorColor: record.interior_color,
    engine: record.engine,
    transmission: record.transmission,
    drivetrain: record.drivetrain,
    odometerKm: record.odometer_km,
    fuelType: record.fuel_type,
    conditionGrade: record.condition_grade,
    conditionReport: record.condition_report,
    damageNotes: Object.freeze([...record.damage_notes]),
    titleStatus: record.title_status,
    province: record.province,
    city: record.city,
    auctionStart: record.auction_start,
    startingBid: record.starting_bid,
    reservePrice: record.reserve_price,
    buyNowPrice: record.buy_now_price,
    images: Object.freeze([...record.images]),
    sellingDealership: record.selling_dealership,
    lot: record.lot,
    currentBid: record.current_bid,
    bidCount: record.bid_count,
  });
}

export const vehicles: readonly Vehicle[] = Object.freeze(
  vehicleRecords.map(toVehicle),
);

export function findVehicleById(vehicleId: string): Vehicle | undefined {
  return vehicles.find((vehicle) => vehicle.id === vehicleId);
}

export function findVehicleByLot(lot: string): Vehicle | undefined {
  return vehicles.find((vehicle) => vehicle.lot === lot);
}
