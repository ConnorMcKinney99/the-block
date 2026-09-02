import { expect, test } from "@playwright/test";

const describe = test.describe;
const it = test;
import { createDemoClock, startDemoClock } from "../domain/auction/demoClock";
import type { KeyValueStorage } from "./storage";
import {
  DEMO_CLOCK_STORAGE_KEY,
  DEMO_CLOCK_STORAGE_VERSION,
  loadDemoClock,
  saveDemoClock,
} from "./demoClockStorage";

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("demo clock storage", () => {
  it("round-trips paused and running clocks in a versioned envelope", () => {
    const storage = new MemoryStorage();
    const paused = { status: "paused" as const, elapsedMs: 42_000 };

    expect(saveDemoClock(storage, paused)).toBe(true);
    expect(loadDemoClock(storage, 100_000)).toEqual(paused);

    const running = startDemoClock(paused, 100_000);
    expect(saveDemoClock(storage, running)).toBe(true);
    expect(loadDemoClock(storage, 100_000)).toEqual(running);
    expect(
      JSON.parse(storage.getItem(DEMO_CLOCK_STORAGE_KEY) ?? "{}"),
    ).toEqual({
      version: DEMO_CLOCK_STORAGE_VERSION,
      clock: running,
    });
  });

  const malformedClockCases = [
    ["corrupt JSON", "{broken"],
    [
      "unsupported version",
      JSON.stringify({ version: 999, clock: createDemoClock() }),
    ],
    [
      "negative elapsed time",
      JSON.stringify({
        version: DEMO_CLOCK_STORAGE_VERSION,
        clock: { status: "paused", elapsedMs: -1 },
      }),
    ],
    [
      "fractional elapsed time",
      JSON.stringify({
        version: DEMO_CLOCK_STORAGE_VERSION,
        clock: { status: "paused", elapsedMs: 1.5 },
      }),
    ],
    [
      "paused clock with a running anchor",
      JSON.stringify({
        version: DEMO_CLOCK_STORAGE_VERSION,
        clock: {
          status: "paused",
          elapsedMs: 0,
          resumedAtEpochMs: 1,
        },
      }),
    ],
    [
      "running clock without an anchor",
      JSON.stringify({
        version: DEMO_CLOCK_STORAGE_VERSION,
        clock: { status: "running", elapsedMs: 0 },
      }),
    ],
  ] as const;

  for (const [label, storedValue] of malformedClockCases) {
    it(`falls back to paused zero for ${label}`, () => {
      const storage = new MemoryStorage();
      storage.setItem(DEMO_CLOCK_STORAGE_KEY, storedValue);

      expect(loadDemoClock(storage, 100_000)).toEqual(createDemoClock());
    });
  }

  it("continues safely when storage access throws", () => {
    const storage: KeyValueStorage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      },
    };

    expect(loadDemoClock(storage, 100_000)).toEqual(createDemoClock());
    expect(saveDemoClock(storage, createDemoClock())).toBe(false);
  });

  it("accounts for offline time and rebases a running clock safely", () => {
    const storage = new MemoryStorage();
    const running = {
      status: "running" as const,
      elapsedMs: 30_000,
      resumedAtEpochMs: 100_000,
    };
    saveDemoClock(storage, running);

    expect(loadDemoClock(storage, 145_000)).toEqual({
      status: "running",
      elapsedMs: 75_000,
      resumedAtEpochMs: 145_000,
    });
    expect(loadDemoClock(storage, 90_000)).toEqual({
      status: "running",
      elapsedMs: 30_000,
      resumedAtEpochMs: 90_000,
    });
  });
});
