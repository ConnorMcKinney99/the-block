import { useRef } from "react";
import styles from "./Inventory.module.css";
import {
  inventoryFilterDefinitions,
  type InventoryFilterKey,
} from "./inventoryCriteria";
import type {
  InventoryFilterOptions,
  InventoryFilters,
} from "./inventoryFilters";
import type {
  InventoryPriceDomain,
  InventoryPriceRange,
} from "./inventoryRefinement";
import { InventoryPriceRangeSlider } from "./InventoryPriceRangeSlider";

function getFilterOptionLabel(
  key: InventoryFilterKey,
  option: string,
): string {
  return key === "lot" ? `Lot ${option}` : option;
}

interface InventoryFilterPanelProps {
  activeCount: number;
  filters: InventoryFilters;
  options: InventoryFilterOptions;
  priceDomain: InventoryPriceDomain;
  priceRange: InventoryPriceRange;
  priceRangeError: string | null;
  onChange: (key: InventoryFilterKey, value: string) => void;
  onPriceChange: (priceRange: InventoryPriceRange) => void;
  onClear: () => void;
}

export function InventoryFilterPanel({
  activeCount,
  filters,
  options,
  priceDomain,
  priceRange,
  priceRangeError,
  onChange,
  onPriceChange,
  onClear,
}: InventoryFilterPanelProps) {
  const filterHeadingRef = useRef<HTMLHeadingElement>(null);

  return (
    <section
      className={styles.filterPanel}
      data-active={activeCount > 0}
      aria-labelledby="inventory-filters-heading"
    >
      <header className={styles.filterPanelHeader}>
        <h2
          id="inventory-filters-heading"
          ref={filterHeadingRef}
          tabIndex={-1}
        >
          Filters
        </h2>
        <span className={styles.filterCount}>
          {activeCount === 0
            ? "All vehicles"
            : `${activeCount} ${activeCount === 1 ? "filter" : "filters"} active`}
        </span>
      </header>

      <div className={styles.filterBody}>
        <div className={styles.filterGrid}>
          {inventoryFilterDefinitions.map(({ key, label, allLabel }) => {
            const selectedValue = filters[key];
            const prerequisiteLabel =
              key === "model" && filters.make === ""
                ? "Select a make first"
                : key === "city" && filters.province === ""
                  ? "Select a province first"
                  : key === "dealership" && filters.province === ""
                    ? "Select a province and city first"
                    : key === "dealership" && filters.city === ""
                      ? "Select a city first"
                      : null;

            return (
              <div className={styles.filterField} key={key}>
                <label htmlFor={`inventory-filter-${key}`}>{label}</label>
                <select
                  id={`inventory-filter-${key}`}
                  value={selectedValue}
                  disabled={prerequisiteLabel !== null}
                  onChange={(event) => onChange(key, event.target.value)}
                >
                  <option value="">
                    {prerequisiteLabel ?? allLabel}
                  </option>
                  {options[key].map((option) => (
                    <option key={option} value={option}>
                      {getFilterOptionLabel(key, option)}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        <InventoryPriceRangeSlider
          domain={priceDomain}
          priceRange={priceRange}
          error={priceRangeError}
          onChange={onPriceChange}
        />

        <p id="inventory-price-help" className={styles.priceHelp}>
          Price range is inclusive and uses whole-dollar CAD amounts shown on
          the cards.
        </p>

        {priceRangeError === null ? null : (
          <p
            id="inventory-price-error"
            className={styles.filterError}
            role="alert"
          >
            {priceRangeError}
          </p>
        )}

        <div className={styles.filterActions}>
          <p>Selections narrow the current search.</p>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                onClear();
                filterHeadingRef.current?.focus();
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
