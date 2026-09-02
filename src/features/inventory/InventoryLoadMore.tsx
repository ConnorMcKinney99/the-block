import { useCallback, useEffect, useRef } from "react";
import { formatNumber } from "../../lib/format";
import styles from "./Inventory.module.css";
import { INVENTORY_BATCH_SIZE } from "./inventoryIncrementalLoading";

interface InventoryLoadMoreProps {
  readonly visibleCount: number;
  readonly totalCount: number;
  readonly hasMore: boolean;
  onLoadMore(): void;
}

export function InventoryLoadMore({
  visibleCount,
  totalCount,
  hasMore,
  onLoadMore,
}: InventoryLoadMoreProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const requestPending = useRef(false);
  const shouldFocusCompletion = useRef(false);

  useEffect(() => {
    requestPending.current = false;

    if (!hasMore && shouldFocusCompletion.current) {
      shouldFocusCompletion.current = false;
      summaryRef.current?.focus();
    }
  }, [hasMore, visibleCount]);

  const requestMore = useCallback(() => {
    if (!hasMore || requestPending.current) {
      return;
    }

    requestPending.current = true;
    shouldFocusCompletion.current =
      document.activeElement === buttonRef.current;
    onLoadMore();
  }, [hasMore, onLoadMore]);

  useEffect(() => {
    const button = buttonRef.current;

    if (
      button === null ||
      !hasMore ||
      typeof IntersectionObserver === "undefined"
    ) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          !requestPending.current &&
          entries.some((entry) => entry.isIntersecting)
        ) {
          observer.unobserve(button);
          requestMore();
        }
      },
      { rootMargin: "500px 0px" },
    );

    observer.observe(button);
    return () => observer.disconnect();
  }, [hasMore, requestMore]);

  const remainingCount = totalCount - visibleCount;
  const nextBatchCount = Math.min(INVENTORY_BATCH_SIZE, remainingCount);
  const vehicleNoun = totalCount === 1 ? "vehicle" : "vehicles";

  return (
    <div className={styles.incrementalLoad}>
      <p
        ref={summaryRef}
        className={styles.loadSummary}
        aria-live="polite"
        aria-atomic="true"
        tabIndex={hasMore ? undefined : -1}
      >
        {hasMore
          ? `Showing ${formatNumber(visibleCount)} of ${formatNumber(totalCount)} ${vehicleNoun}.`
          : `All ${formatNumber(totalCount)} matching ${vehicleNoun} loaded.`}
      </p>
      {hasMore ? (
        <button
          ref={buttonRef}
          className={styles.loadMoreButton}
          type="button"
          onClick={requestMore}
        >
          Load {formatNumber(nextBatchCount)} more {nextBatchCount === 1 ? "vehicle" : "vehicles"}
        </button>
      ) : null}
    </div>
  );
}
