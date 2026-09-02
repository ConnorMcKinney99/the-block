import type { AuctionTiming } from "../../domain/auction/auctionLifecycle";
import type { Vehicle } from "../../domain/vehicle/types";

export const INVENTORY_MIN_PRICE_PARAM = "minPrice";
export const INVENTORY_MAX_PRICE_PARAM = "maxPrice";
export const INVENTORY_SORT_PARAM = "sort";

export const inventorySortOptions = [
  { value: "default", label: "Default order" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "ending-soon", label: "Ending soon" },
] as const;

export type InventorySort = (typeof inventorySortOptions)[number]["value"];

export interface InventoryPriceRange {
  readonly minimum: number | null;
  readonly maximum: number | null;
}

export interface InventoryPriceDomain {
  readonly minimum: number;
  readonly maximum: number;
}

export interface InventoryListing {
  readonly vehicle: Vehicle;
  readonly displayedPrice: number;
  readonly timing: AuctionTiming;
  readonly originalIndex: number;
}

function parsePriceBound(value: string | null): number | null {
  const normalizedValue = value?.trim() ?? "";

  if (!/^(?:0|[1-9]\d*)$/u.test(normalizedValue)) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
}

export function readInventoryPriceRange(
  searchParams: URLSearchParams,
): InventoryPriceRange {
  return {
    minimum: parsePriceBound(searchParams.get(INVENTORY_MIN_PRICE_PARAM)),
    maximum: parsePriceBound(searchParams.get(INVENTORY_MAX_PRICE_PARAM)),
  };
}

export function isInventoryPriceRangeActive(
  priceRange: InventoryPriceRange,
): boolean {
  return priceRange.minimum !== null || priceRange.maximum !== null;
}

export function getInventoryPriceRangeError(
  priceRange: InventoryPriceRange,
): string | null {
  return priceRange.minimum !== null &&
    priceRange.maximum !== null &&
    priceRange.minimum > priceRange.maximum
    ? "Minimum price must be less than or equal to maximum price."
    : null;
}

export function getInventoryPriceDomain(
  listings: readonly InventoryListing[],
): InventoryPriceDomain {
  const prices = listings.map(({ displayedPrice }) => displayedPrice);

  if (prices.length === 0) {
    return { minimum: 0, maximum: 1 };
  }

  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);

  return maximum === minimum
    ? { minimum, maximum: minimum + 1 }
    : { minimum, maximum };
}

function clampPriceBound(value: number, domain: InventoryPriceDomain): number {
  return Math.min(domain.maximum, Math.max(domain.minimum, value));
}

export function normalizeInventoryPriceRange(
  priceRange: InventoryPriceRange,
  domain: InventoryPriceDomain,
): InventoryPriceRange {
  const clampedMinimum =
    priceRange.minimum === null
      ? null
      : clampPriceBound(priceRange.minimum, domain);
  const clampedMaximum =
    priceRange.maximum === null
      ? null
      : clampPriceBound(priceRange.maximum, domain);

  return {
    minimum:
      clampedMinimum === domain.minimum ? null : clampedMinimum,
    maximum:
      clampedMaximum === domain.maximum ? null : clampedMaximum,
  };
}

export function readInventorySort(searchParams: URLSearchParams): InventorySort {
  switch (searchParams.get(INVENTORY_SORT_PARAM)) {
    case "price-asc":
      return "price-asc";
    case "price-desc":
      return "price-desc";
    case "ending-soon":
      return "ending-soon";
    default:
      return "default";
  }
}

function lifecycleRank(timing: AuctionTiming): number {
  switch (timing.lifecycle) {
    case "open":
      return 0;
    case "upcoming":
      return 1;
    case "closed":
      return 2;
  }
}

function compareByOriginalIndex(
  left: InventoryListing,
  right: InventoryListing,
): number {
  return left.originalIndex - right.originalIndex;
}

function compareEndingSoon(
  left: InventoryListing,
  right: InventoryListing,
): number {
  const rankDifference = lifecycleRank(left.timing) - lifecycleRank(right.timing);

  if (rankDifference !== 0) {
    return rankDifference;
  }

  if (left.timing.lifecycle !== "closed") {
    const endDifference =
      left.timing.schedule.endOffsetMs - right.timing.schedule.endOffsetMs;

    if (endDifference !== 0) {
      return endDifference;
    }
  }

  return compareByOriginalIndex(left, right);
}

function compareListings(
  left: InventoryListing,
  right: InventoryListing,
  sort: InventorySort,
): number {
  if (sort === "ending-soon") {
    return compareEndingSoon(left, right);
  }

  const priceDifference = left.displayedPrice - right.displayedPrice;

  if (priceDifference !== 0) {
    return sort === "price-desc" ? -priceDifference : priceDifference;
  }

  return compareByOriginalIndex(left, right);
}

export function refineInventoryListings(
  listings: readonly InventoryListing[],
  priceRange: InventoryPriceRange,
  sort: InventorySort,
): readonly InventoryListing[] {
  const filteredListings = listings.filter(
    ({ displayedPrice }) =>
      (priceRange.minimum === null || displayedPrice >= priceRange.minimum) &&
      (priceRange.maximum === null || displayedPrice <= priceRange.maximum),
  );

  if (sort === "default") {
    return filteredListings;
  }

  return [...filteredListings].sort((left, right) =>
    compareListings(left, right, sort),
  );
}
