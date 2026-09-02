export const INVENTORY_BATCH_SIZE = 24;

export interface IncrementalInventory<T> {
  readonly items: readonly T[];
  readonly visibleCount: number;
  readonly totalCount: number;
  readonly hasMore: boolean;
  readonly nextVisibleCount: number;
}

function normalizeRequestedCount(requestedCount: number): number {
  return Number.isSafeInteger(requestedCount) && requestedCount > 0
    ? Math.max(INVENTORY_BATCH_SIZE, requestedCount)
    : INVENTORY_BATCH_SIZE;
}

export function getIncrementalInventory<T>(
  items: readonly T[],
  requestedCount: number,
): IncrementalInventory<T> {
  const totalCount = items.length;
  const visibleCount = Math.min(
    totalCount,
    normalizeRequestedCount(requestedCount),
  );

  return {
    items: items.slice(0, visibleCount),
    visibleCount,
    totalCount,
    hasMore: visibleCount < totalCount,
    nextVisibleCount: Math.min(
      totalCount,
      visibleCount + INVENTORY_BATCH_SIZE,
    ),
  };
}
