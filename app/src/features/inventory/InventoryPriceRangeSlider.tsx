import { useEffect, useRef, useState, type CSSProperties } from "react";
import { formatCad } from "../../lib/format";
import styles from "./Inventory.module.css";
import type {
  InventoryPriceDomain,
  InventoryPriceRange,
} from "./inventoryRefinement";

interface PriceRangeStyle extends CSSProperties {
  readonly "--price-range-start": string;
  readonly "--price-range-end": string;
}

interface InventoryPriceRangeSliderProps {
  readonly domain: InventoryPriceDomain;
  readonly priceRange: InventoryPriceRange;
  readonly error: string | null;
  onChange(priceRange: InventoryPriceRange): void;
}

function asOptionalBound(
  value: number,
  edge: number,
): number | null {
  return value === edge ? null : value;
}

export function InventoryPriceRangeSlider({
  domain,
  priceRange,
  error,
  onChange,
}: InventoryPriceRangeSliderProps) {
  const [focusedHandle, setFocusedHandle] = useState<"minimum" | "maximum" | null>(
    null,
  );
  const priceRangeMinimum = priceRange.minimum;
  const priceRangeMaximum = priceRange.maximum;
  const pendingRangeRef = useRef(priceRange);

  useEffect(() => {
    pendingRangeRef.current = {
      minimum: priceRangeMinimum,
      maximum: priceRangeMaximum,
    };
  }, [priceRangeMaximum, priceRangeMinimum]);

  const minimumValue = priceRange.minimum ?? domain.minimum;
  const maximumValue = priceRange.maximum ?? domain.maximum;
  const span = Math.max(1, domain.maximum - domain.minimum);
  const startPercent = ((minimumValue - domain.minimum) / span) * 100;
  const endPercent = ((maximumValue - domain.minimum) / span) * 100;
  const rangeStyle: PriceRangeStyle = {
    "--price-range-start": `${Math.min(startPercent, endPercent)}%`,
    "--price-range-end": `${Math.max(startPercent, endPercent)}%`,
  };
  const description =
    error === null
      ? "inventory-price-help"
      : "inventory-price-help inventory-price-error";

  return (
    <fieldset className={styles.priceRange}>
      <legend>Price range</legend>
      <div className={styles.priceValues} aria-hidden="true">
        <span>{formatCad(minimumValue)}</span>
        <span>{formatCad(maximumValue)}</span>
      </div>
      <div
        className={styles.priceTrack}
        data-coincident={minimumValue === maximumValue || undefined}
        style={rangeStyle}
      >
        <input
          className={styles.priceRangeInput}
          data-handle="minimum"
          data-focused={focusedHandle === "minimum" || undefined}
          type="range"
          min={domain.minimum}
          max={domain.maximum}
          step="1"
          value={minimumValue}
          aria-label="Minimum price"
          aria-valuetext={formatCad(minimumValue)}
          aria-describedby={description}
          aria-invalid={error === null ? undefined : true}
          onFocus={() => setFocusedHandle("minimum")}
          onBlur={() => setFocusedHandle(null)}
          onChange={(event) => {
            const pendingRange = pendingRangeRef.current;
            const pendingMaximum = pendingRange.maximum ?? domain.maximum;
            const value = Math.min(
              Number(event.target.value),
              pendingMaximum,
            );
            const nextRange = {
              minimum: asOptionalBound(value, domain.minimum),
              maximum: pendingRange.maximum,
            };

            pendingRangeRef.current = nextRange;
            onChange(nextRange);
          }}
        />
        <input
          className={styles.priceRangeInput}
          data-handle="maximum"
          data-focused={focusedHandle === "maximum" || undefined}
          type="range"
          min={domain.minimum}
          max={domain.maximum}
          step="1"
          value={maximumValue}
          aria-label="Maximum price"
          aria-valuetext={formatCad(maximumValue)}
          aria-describedby={description}
          aria-invalid={error === null ? undefined : true}
          onFocus={() => setFocusedHandle("maximum")}
          onBlur={() => setFocusedHandle(null)}
          onChange={(event) => {
            const pendingRange = pendingRangeRef.current;
            const pendingMinimum = pendingRange.minimum ?? domain.minimum;
            const value = Math.max(
              Number(event.target.value),
              pendingMinimum,
            );
            const nextRange = {
              minimum: pendingRange.minimum,
              maximum: asOptionalBound(value, domain.maximum),
            };

            pendingRangeRef.current = nextRange;
            onChange(nextRange);
          }}
        />
      </div>
    </fieldset>
  );
}
