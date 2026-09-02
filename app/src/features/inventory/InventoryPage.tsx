import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { vehicles } from "../../data/vehicles";
import { getAuctionDisplayForLifecycle } from "../../domain/auction/selectors";
import { formatNumber } from "../../lib/format";
import { useAuction } from "../../state/useAuction";
import { DemoControls } from "../demo/DemoControls";
import styles from "./Inventory.module.css";
import { InventoryFilterPanel } from "./InventoryFilterPanel";
import { InventoryLoadMore } from "./InventoryLoadMore";
import {
  inventoryFilterDefinitions,
  removedInventoryFilterKeys,
  type InventoryFilterKey,
} from "./inventoryCriteria";
import {
  countActiveFilters,
  filterVehicles,
  resolveInventoryFilters,
} from "./inventoryFilters";
import {
  getIncrementalInventory,
  INVENTORY_BATCH_SIZE,
} from "./inventoryIncrementalLoading";
import {
  getInventoryPriceDomain,
  getInventoryPriceRangeError,
  INVENTORY_MAX_PRICE_PARAM,
  INVENTORY_MIN_PRICE_PARAM,
  INVENTORY_SORT_PARAM,
  inventorySortOptions,
  isInventoryPriceRangeActive,
  normalizeInventoryPriceRange,
  readInventoryPriceRange,
  readInventorySort,
  refineInventoryListings,
  type InventoryListing,
  type InventoryPriceRange,
  type InventorySort,
} from "./inventoryRefinement";
import { searchVehicles } from "./searchVehicles";
import { VehicleGrid } from "./VehicleGrid";

const vehicleOrder = new Map(
  vehicles.map((vehicle, index) => [vehicle.id, index] as const),
);

function deleteInventoryFilterParams(searchParams: URLSearchParams) {
  inventoryFilterDefinitions.forEach(({ key }) => searchParams.delete(key));
  removedInventoryFilterKeys.forEach((key) => searchParams.delete(key));
  searchParams.delete(INVENTORY_MIN_PRICE_PARAM);
  searchParams.delete(INVENTORY_MAX_PRICE_PARAM);
}

function hasCanonicalParam(
  searchParams: URLSearchParams,
  key: string,
  canonicalValue: string | null,
): boolean {
  const storedValues = searchParams.getAll(key);

  return canonicalValue === null
    ? storedValues.length === 0
    : storedValues.length === 1 && storedValues[0] === canonicalValue;
}

function resultCountLabel(count: number): string {
  return `${formatNumber(count)} ${count === 1 ? "vehicle" : "vehicles"}`;
}

function emptyStateMessage(
  query: string,
  activeFilterCount: number,
  priceRangeError: string | null,
): string {
  if (priceRangeError !== null) {
    return "Adjust the price range to see matching vehicles.";
  }

  const trimmedQuery = query.trim();

  if (trimmedQuery !== "" && activeFilterCount > 0) {
    return `No inventory matches “${trimmedQuery}” with the selected filters. Try a broader search or remove a filter.`;
  }

  if (trimmedQuery !== "") {
    return `No inventory matches “${trimmedQuery}”. Check the spelling or try a broader search.`;
  }

  return "No inventory matches the selected filters. Remove a filter to broaden the results.";
}

function sortStatusLabel(sort: InventorySort): string {
  switch (sort) {
    case "price-asc":
      return ". Sorted by price, low to high.";
    case "price-desc":
      return ". Sorted by price, high to low.";
    case "ending-soon":
      return ". Sorted by ending soon.";
    case "default":
      return "";
  }
}

interface IncrementalLoadingState {
  readonly criteriaKey: string;
  readonly requestedCount: number;
}

export function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getOverlay, getTiming } = useAuction();
  const query = searchParams.get("q") ?? "";
  const resolvedFilters = useMemo(
    () => resolveInventoryFilters(vehicles, searchParams),
    [searchParams],
  );
  const { filters, options: filterOptions } = resolvedFilters;
  const requestedPriceRange = useMemo(
    () => readInventoryPriceRange(searchParams),
    [searchParams],
  );
  const sort = readInventorySort(searchParams);
  const allListings: readonly InventoryListing[] = vehicles.map((vehicle) => {
    const overlay = getOverlay(vehicle);
    const timing = getTiming(vehicle);
    const auction = getAuctionDisplayForLifecycle(
      vehicle,
      overlay,
      timing.lifecycle,
    );

    return {
      vehicle,
      displayedPrice: auction.purchasePrice ?? auction.publicPrice,
      timing,
      originalIndex: vehicleOrder.get(vehicle.id) ?? 0,
    };
  });
  const priceDomain = getInventoryPriceDomain(allListings);
  const priceRange = normalizeInventoryPriceRange(
    requestedPriceRange,
    priceDomain,
  );
  const priceRangeError = getInventoryPriceRangeError(priceRange);
  const activeFilterCount =
    countActiveFilters(filters) +
    (isInventoryPriceRangeActive(priceRange) ? 1 : 0);
  const listingByVehicleId = new Map(
    allListings.map((listing) => [listing.vehicle.id, listing] as const),
  );
  const matchingVehicles = filterVehicles(
    searchVehicles(vehicles, query),
    filters,
  );
  const matchingListings = matchingVehicles.flatMap((vehicle) => {
    const listing = listingByVehicleId.get(vehicle.id);
    return listing === undefined ? [] : [listing];
  });
  const results = refineInventoryListings(
    matchingListings,
    priceRange,
    sort,
  ).map(({ vehicle }) => vehicle);
  const criteriaKey = JSON.stringify([
    query,
    ...inventoryFilterDefinitions.map(({ key }) => filters[key]),
    priceRange.minimum,
    priceRange.maximum,
    sort,
  ]);
  const [loadingState, setLoadingState] = useState<IncrementalLoadingState>(
    () => ({
      criteriaKey,
      requestedCount: INVENTORY_BATCH_SIZE,
    }),
  );
  const requestedCount =
    loadingState.criteriaKey === criteriaKey
      ? loadingState.requestedCount
      : INVENTORY_BATCH_SIZE;
  const incrementalInventory = getIncrementalInventory(
    results,
    requestedCount,
  );

  useEffect(() => {
    const hasCanonicalFilters = inventoryFilterDefinitions.every(({ key }) => {
      const storedValues = searchParams.getAll(key);
      const canonicalValue = filters[key];

      return canonicalValue === ""
        ? storedValues.length === 0
        : storedValues.length === 1 && storedValues[0] === canonicalValue;
    });
    const hasRemovedFilters = removedInventoryFilterKeys.some((key) =>
      searchParams.has(key),
    );
    const canonicalMinimum =
      priceRange.minimum === null ? null : String(priceRange.minimum);
    const canonicalMaximum =
      priceRange.maximum === null ? null : String(priceRange.maximum);
    const canonicalSort = sort === "default" ? null : sort;
    const hasCanonicalPriceRange =
      hasCanonicalParam(
        searchParams,
        INVENTORY_MIN_PRICE_PARAM,
        canonicalMinimum,
      ) &&
      hasCanonicalParam(
        searchParams,
        INVENTORY_MAX_PRICE_PARAM,
        canonicalMaximum,
      );
    const hasCanonicalSort = hasCanonicalParam(
      searchParams,
      INVENTORY_SORT_PARAM,
      canonicalSort,
    );

    if (
      !searchParams.has("page") &&
      hasCanonicalFilters &&
      hasCanonicalPriceRange &&
      hasCanonicalSort &&
      !hasRemovedFilters
    ) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);

    nextParams.delete("page");
    deleteInventoryFilterParams(nextParams);
    nextParams.delete(INVENTORY_SORT_PARAM);

    inventoryFilterDefinitions.forEach(({ key }) => {
      if (filters[key] !== "") {
        nextParams.set(key, filters[key]);
      }
    });

    if (canonicalMinimum !== null) {
      nextParams.set(INVENTORY_MIN_PRICE_PARAM, canonicalMinimum);
    }

    if (canonicalMaximum !== null) {
      nextParams.set(INVENTORY_MAX_PRICE_PARAM, canonicalMaximum);
    }

    if (canonicalSort !== null) {
      nextParams.set(INVENTORY_SORT_PARAM, canonicalSort);
    }

    setSearchParams(nextParams, { replace: true });
  }, [filters, priceRange, searchParams, setSearchParams, sort]);

  function updateQuery(nextQuery: string) {
    const nextParams = new URLSearchParams(searchParams);

    if (nextQuery.trim() === "") {
      nextParams.delete("q");
    } else {
      nextParams.set("q", nextQuery);
    }

    nextParams.delete("page");
    setSearchParams(nextParams, { replace: true });
  }

  function updateFilter(key: InventoryFilterKey, value: string) {
    const nextParams = new URLSearchParams(searchParams);

    if (key === "make") {
      nextParams.delete("model");
    }

    if (value === "") {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }

    nextParams.delete("page");
    setSearchParams(nextParams, { replace: true });
  }

  function updatePriceRange(nextRange: InventoryPriceRange) {
    const nextParams = new URLSearchParams(searchParams);

    nextParams.delete(INVENTORY_MIN_PRICE_PARAM);
    nextParams.delete(INVENTORY_MAX_PRICE_PARAM);

    if (nextRange.minimum !== null) {
      nextParams.set(INVENTORY_MIN_PRICE_PARAM, String(nextRange.minimum));
    }

    if (nextRange.maximum !== null) {
      nextParams.set(INVENTORY_MAX_PRICE_PARAM, String(nextRange.maximum));
    }

    nextParams.delete("page");
    setSearchParams(nextParams, { replace: true });
  }

  function updateSort(nextSort: InventorySort) {
    const nextParams = new URLSearchParams(searchParams);

    if (nextSort === "default") {
      nextParams.delete(INVENTORY_SORT_PARAM);
    } else {
      nextParams.set(INVENTORY_SORT_PARAM, nextSort);
    }

    nextParams.delete("page");
    setSearchParams(nextParams, { replace: true });
  }

  function clearFilters() {
    const nextParams = new URLSearchParams(searchParams);

    deleteInventoryFilterParams(nextParams);
    nextParams.delete("page");
    setSearchParams(nextParams, { replace: true });
  }

  function viewAllVehicles() {
    const nextParams = new URLSearchParams(searchParams);

    nextParams.delete("q");
    deleteInventoryFilterParams(nextParams);
    nextParams.delete("page");
    setSearchParams(nextParams, { replace: true });
  }

  function loadMoreVehicles() {
    setLoadingState((currentState) => {
      const currentCount =
        currentState.criteriaKey === criteriaKey
          ? currentState.requestedCount
          : INVENTORY_BATCH_SIZE;
      const nextCount = getIncrementalInventory(
        results,
        currentCount,
      ).nextVisibleCount;

      return { criteriaKey, requestedCount: nextCount };
    });
  }

  function resultContext(): string {
    const trimmedQuery = query.trim();
    const filterLabel = `${activeFilterCount} ${
      activeFilterCount === 1 ? "filter" : "filters"
    }`;

    if (trimmedQuery !== "" && activeFilterCount > 0) {
      return ` matching “${trimmedQuery}” and ${filterLabel}`;
    }

    if (trimmedQuery !== "") {
      return ` matching “${trimmedQuery}”`;
    }

    if (activeFilterCount > 0) {
      return ` matching ${filterLabel}`;
    }

    return " in inventory";
  }

  return (
    <div className={styles.page}>
      <DemoControls />
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Buyer marketplace</p>
          <h1>Auction inventory</h1>
          <p className={styles.intro}>
            Review wholesale vehicles from dealerships across Canada.
          </p>
        </div>

        <div className={styles.inventoryTotal} aria-label="Total inventory">
          <strong>{formatNumber(vehicles.length)}</strong>
          <span>vehicles in inventory</span>
        </div>
      </header>

      <div className={styles.inventoryLayout}>
        <aside
          className={styles.filterSidebar}
          aria-label="Inventory filters"
        >
          <InventoryFilterPanel
            activeCount={activeFilterCount}
            filters={filters}
            options={filterOptions}
            priceDomain={priceDomain}
            priceRange={priceRange}
            priceRangeError={priceRangeError}
            onChange={updateFilter}
            onPriceChange={updatePriceRange}
            onClear={clearFilters}
          />
        </aside>

        <div className={styles.inventoryResultsColumn}>
          <section
            className={styles.inventoryControls}
            aria-label="Inventory controls"
          >
            <section className={styles.searchPanel} aria-label="Search inventory">
              <div className={styles.searchField} role="search">
                <label className={styles.searchLabel} htmlFor="inventory-search">
                  Search inventory
                </label>
                <input
                  id="inventory-search"
                  type="search"
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                  placeholder="Year, make, model, trim, lot, VIN, dealer, city, or province"
                  autoComplete="off"
                />
              </div>

              <div className={styles.resultsSummary}>
                <p role="status" aria-live="polite" aria-atomic="true">
                  <strong>{resultCountLabel(results.length)}</strong>
                  {resultContext()}
                  {sortStatusLabel(sort)}
                </p>
                {query.trim() !== "" ? (
                  <button type="button" onClick={() => updateQuery("")}>
                    Clear search
                  </button>
                ) : null}
              </div>

              <div className={styles.sortField}>
                <label className={styles.searchLabel} htmlFor="inventory-sort">
                  Sort inventory
                </label>
                <select
                  id="inventory-sort"
                  value={sort}
                  onChange={(event) =>
                    updateSort(event.target.value as InventorySort)
                  }
                >
                  {inventorySortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          </section>

          {results.length > 0 ? (
            <>
              <VehicleGrid vehicles={incrementalInventory.items} />
              <InventoryLoadMore
                visibleCount={incrementalInventory.visibleCount}
                totalCount={incrementalInventory.totalCount}
                hasMore={incrementalInventory.hasMore}
                onLoadMore={loadMoreVehicles}
              />
            </>
          ) : (
            <section className={styles.emptyState} aria-labelledby="empty-title">
              <p className={styles.emptyMark} aria-hidden="true">
                0
              </p>
              <h2 id="empty-title">No vehicles found</h2>
              <p>{emptyStateMessage(query, activeFilterCount, priceRangeError)}</p>
              <button type="button" onClick={viewAllVehicles}>
                View all vehicles
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
