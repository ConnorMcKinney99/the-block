import type { Vehicle } from "../../domain/vehicle/types";
import {
  getInventoryFilterCriterion,
  inventoryFilterDefinitions,
  normalizeInventoryFilterCriterion,
  normalizeInventoryCriterion,
  type InventoryFilterKey,
} from "./inventoryCriteria";

export type InventoryFilters = Readonly<
  Record<InventoryFilterKey, string>
>;

export type InventoryFilterOptions = Readonly<
  Record<InventoryFilterKey, readonly string[]>
>;

export interface ResolvedInventoryFilters {
  readonly filters: InventoryFilters;
  readonly options: InventoryFilterOptions;
}

function findCanonicalOption(
  key: InventoryFilterKey,
  storedValue: string,
  options: readonly string[],
): string {
  const normalizedStoredValue = normalizeInventoryFilterCriterion(
    key,
    storedValue,
  );

  if (normalizedStoredValue === "") {
    return "";
  }

  return (
    options.find(
      (option) =>
        normalizeInventoryFilterCriterion(key, option) ===
        normalizedStoredValue,
    ) ?? ""
  );
}

function readFilterValue(
  searchParams: URLSearchParams,
  key: InventoryFilterKey,
  options?: InventoryFilterOptions,
): string {
  const storedValue = searchParams.get(key) ?? "";

  return options === undefined
    ? storedValue.trim()
    : findCanonicalOption(key, storedValue, options[key]);
}

export function readInventoryFilters(
  searchParams: URLSearchParams,
  options?: InventoryFilterOptions,
): InventoryFilters {
  return {
    year: readFilterValue(searchParams, "year", options),
    make: readFilterValue(searchParams, "make", options),
    model: readFilterValue(searchParams, "model", options),
    lot: readFilterValue(searchParams, "lot", options),
    dealership: readFilterValue(searchParams, "dealership", options),
    city: readFilterValue(searchParams, "city", options),
    province: readFilterValue(searchParams, "province", options),
  };
}

export function countActiveFilters(filters: InventoryFilters): number {
  return inventoryFilterDefinitions.filter(
    ({ key }) => normalizeInventoryCriterion(filters[key]) !== "",
  ).length;
}

export function filterVehicles(
  inventory: readonly Vehicle[],
  filters: InventoryFilters,
): readonly Vehicle[] {
  if (countActiveFilters(filters) === 0) {
    return inventory;
  }

  return inventory.filter((vehicle) =>
    inventoryFilterDefinitions.every(({ key }) => {
      const selectedValue = normalizeInventoryFilterCriterion(
        key,
        filters[key],
      );

      return (
        selectedValue === "" ||
        normalizeInventoryFilterCriterion(
          key,
          getInventoryFilterCriterion(vehicle, key),
        ) === selectedValue
      );
    }),
  );
}

function getSortedOptions(
  inventory: readonly Vehicle[],
  key: InventoryFilterKey,
): readonly string[] {
  const options = Array.from(
    new Set(
      inventory.map((vehicle) => getInventoryFilterCriterion(vehicle, key)),
    ),
  );

  if (key === "year") {
    return options.sort((left, right) => Number(right) - Number(left));
  }

  return options.sort((left, right) =>
    left.localeCompare(right, "en-CA", {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

export function getInventoryFilterOptions(
  inventory: readonly Vehicle[],
  selectedMake = "",
): InventoryFilterOptions {
  const normalizedMake = normalizeInventoryCriterion(selectedMake);
  const modelInventory =
    normalizedMake === ""
      ? []
      : inventory.filter(
          (vehicle) =>
            normalizeInventoryCriterion(vehicle.make) === normalizedMake,
        );

  return {
    year: getSortedOptions(inventory, "year"),
    make: getSortedOptions(inventory, "make"),
    model: getSortedOptions(modelInventory, "model"),
    lot: getSortedOptions(inventory, "lot"),
    dealership: getSortedOptions(inventory, "dealership"),
    city: getSortedOptions(inventory, "city"),
    province: getSortedOptions(inventory, "province"),
  };
}

export function resolveInventoryFilters(
  inventory: readonly Vehicle[],
  searchParams: URLSearchParams,
): ResolvedInventoryFilters {
  const makeOptions = getSortedOptions(inventory, "make");
  const requestedMake = findCanonicalOption(
    "make",
    searchParams.get("make") ?? "",
    makeOptions,
  );
  const options = getInventoryFilterOptions(inventory, requestedMake);

  return {
    filters: readInventoryFilters(searchParams, options),
    options,
  };
}
