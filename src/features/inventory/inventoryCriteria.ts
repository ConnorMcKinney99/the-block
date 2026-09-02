import type { Vehicle } from "../../domain/vehicle/types";

export const inventoryFilterDefinitions = [
  { key: "year", label: "Year", allLabel: "All years" },
  { key: "make", label: "Make", allLabel: "All makes" },
  { key: "model", label: "Model", allLabel: "All models" },
  { key: "lot", label: "Lot series", allLabel: "All lot series" },
  { key: "province", label: "Province", allLabel: "All provinces" },
  { key: "city", label: "City", allLabel: "All cities" },
  {
    key: "dealership",
    label: "Dealership",
    allLabel: "All dealerships",
  },
] as const;

export const removedInventoryFilterKeys = ["trim", "vin"] as const;

export type InventoryFilterKey =
  (typeof inventoryFilterDefinitions)[number]["key"];

export function normalizeInventoryCriterion(value: string): string {
  return value.trim().toLocaleLowerCase("en-CA");
}

function getLotSeries(lot: string): string {
  const separatorIndex = lot.indexOf("-");

  return separatorIndex > 0 ? lot.slice(0, separatorIndex) : lot;
}

export function normalizeInventoryFilterCriterion(
  key: InventoryFilterKey,
  value: string,
): string {
  return normalizeInventoryCriterion(key === "lot" ? getLotSeries(value) : value);
}

export function getInventoryFilterCriterion(
  vehicle: Vehicle,
  key: InventoryFilterKey,
): string {
  switch (key) {
    case "year":
      return String(vehicle.year);
    case "make":
      return vehicle.make;
    case "model":
      return vehicle.model;
    case "lot":
      return getLotSeries(vehicle.lot);
    case "dealership":
      return vehicle.sellingDealership;
    case "city":
      return vehicle.city;
    case "province":
      return vehicle.province;
  }
}

export function getInventorySearchText(vehicle: Vehicle): string {
  return normalizeInventoryCriterion(
    [
      String(vehicle.year),
      vehicle.make,
      vehicle.model,
      vehicle.trim,
      vehicle.lot,
      vehicle.vin,
      vehicle.sellingDealership,
      vehicle.city,
      vehicle.province,
    ].join(" "),
  );
}
