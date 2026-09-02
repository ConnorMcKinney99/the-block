import { expect, test } from "@playwright/test";

const describe = test.describe;
const it = test;
import {
  createDemoClock,
  getDemoElapsedMs,
  pauseDemoClock,
  resetDemoClock,
  startDemoClock,
} from "./demoClock";

describe("demo clock", () => {
  it("starts at paused zero and advances from wall time only while running", () => {
    const initial = createDemoClock();
    const running = startDemoClock(initial, 1_000);

    expect(initial).toEqual({ status: "paused", elapsedMs: 0 });
    expect(getDemoElapsedMs(running, 4_500)).toBe(3_500);
    expect(startDemoClock(running, 9_000)).toBe(running);
  });

  it("materializes elapsed time on pause and resumes from that value", () => {
    const firstRun = startDemoClock(createDemoClock(), 1_000);
    const paused = pauseDemoClock(firstRun, 4_000);
    const resumed = startDemoClock(paused, 10_000);

    expect(paused).toEqual({ status: "paused", elapsedMs: 3_000 });
    expect(getDemoElapsedMs(paused, 100_000)).toBe(3_000);
    expect(getDemoElapsedMs(resumed, 12_500)).toBe(5_500);
    expect(pauseDemoClock(paused, 200_000)).toBe(paused);
  });

  it("resets to paused zero", () => {
    expect(resetDemoClock()).toEqual({ status: "paused", elapsedMs: 0 });
  });

  it("does not decrease for wall-clock rollback and saturates safely", () => {
    const running = {
      status: "running" as const,
      elapsedMs: Number.MAX_SAFE_INTEGER - 5,
      resumedAtEpochMs: 1_000,
    };

    expect(getDemoElapsedMs(running, 500)).toBe(Number.MAX_SAFE_INTEGER - 5);
    expect(getDemoElapsedMs(running, 2_000)).toBe(Number.MAX_SAFE_INTEGER);
  });
});
