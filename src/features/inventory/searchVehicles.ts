import type { Vehicle } from "../../domain/vehicle/types";
import {
  getInventorySearchText,
  normalizeInventoryCriterion,
} from "./inventoryCriteria";

export function searchVehicles(
  inventory: readonly Vehicle[],
  query: string,
): readonly Vehicle[] {
  const terms = normalizeInventoryCriterion(query).split(/\s+/u).filter(Boolean);

  if (terms.length === 0) {
    return inventory;
  }

  return inventory.filter((vehicle) => {
    const searchText = getInventorySearchText(vehicle);
    return terms.every((term) => searchText.includes(term));
  });
}
