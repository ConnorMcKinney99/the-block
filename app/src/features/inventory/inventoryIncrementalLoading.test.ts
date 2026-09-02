import { expect, test } from "@playwright/test";

const describe = test.describe;
const it = test;
import {
  getIncrementalInventory,
  INVENTORY_BATCH_SIZE,
} from "./inventoryIncrementalLoading";

describe("incremental inventory loading", () => {
  const items = Array.from({ length: 200 }, (_, index) => index + 1);

  it("returns the first batch and the next clamped count", () => {
    const result = getIncrementalInventory(items, INVENTORY_BATCH_SIZE);

    expect(result.items).toEqual(items.slice(0, 24));
    expect(result.visibleCount).toBe(24);
    expect(result.nextVisibleCount).toBe(48);
    expect(result.hasMore).toBe(true);
  });

  it("returns subsequent and partial final batches without exceeding results", () => {
    expect(getIncrementalInventory(items, 48).items).toEqual(items.slice(0, 48));

    const final = getIncrementalInventory(items, 192);
    expect(final.visibleCount).toBe(192);
    expect(final.nextVisibleCount).toBe(200);

    const complete = getIncrementalInventory(items, final.nextVisibleCount);
    expect(complete.items).toEqual(items);
    expect(complete.hasMore).toBe(false);
  });

  it("clamps safely for empty, shortened, and invalid requests", () => {
    expect(getIncrementalInventory([], Number.NaN)).toMatchObject({
      items: [],
      visibleCount: 0,
      totalCount: 0,
      hasMore: false,
    });
    expect(getIncrementalInventory(items.slice(0, 10), 96)).toMatchObject({
      visibleCount: 10,
      nextVisibleCount: 10,
      hasMore: false,
    });
    expect(getIncrementalInventory(items, 0).visibleCount).toBe(24);
  });
});
