import {
  createDemoClock,
  getDemoElapsedMs,
  type DemoClockState,
} from "../domain/auction/demoClock";
import type { KeyValueStorage } from "./storage";

export const DEMO_CLOCK_STORAGE_KEY = "the-block:demo-clock";
export const DEMO_CLOCK_STORAGE_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function parseDemoClock(value: unknown): DemoClockState | null {
  if (!isRecord(value) || !isNonNegativeSafeInteger(value.elapsedMs)) {
    return null;
  }

  if (value.status === "paused") {
    return "resumedAtEpochMs" in value
      ? null
      : { status: "paused", elapsedMs: value.elapsedMs };
  }

  if (
    value.status === "running" &&
    isNonNegativeSafeInteger(value.resumedAtEpochMs)
  ) {
    return {
      status: "running",
      elapsedMs: value.elapsedMs,
      resumedAtEpochMs: value.resumedAtEpochMs,
    };
  }

  return null;
}

export function loadDemoClock(
  storage: KeyValueStorage,
  wallTimeMs: number,
): DemoClockState {
  let storedValue: string | null;

  try {
    storedValue = storage.getItem(DEMO_CLOCK_STORAGE_KEY);
  } catch {
    return createDemoClock();
  }

  if (storedValue === null) {
    return createDemoClock();
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(storedValue) as unknown;
  } catch {
    return createDemoClock();
  }

  if (
    !isRecord(parsed) ||
    parsed.version !== DEMO_CLOCK_STORAGE_VERSION
  ) {
    return createDemoClock();
  }

  const clock = parseDemoClock(parsed.clock);

  if (clock === null) {
    return createDemoClock();
  }

  if (clock.status === "paused") {
    return clock;
  }

  const safeWallTime =
    Number.isSafeInteger(wallTimeMs) && wallTimeMs >= 0 ? wallTimeMs : 0;

  return {
    status: "running",
    elapsedMs: getDemoElapsedMs(clock, safeWallTime),
    resumedAtEpochMs: safeWallTime,
  };
}

export function saveDemoClock(
  storage: KeyValueStorage,
  clock: DemoClockState,
): boolean {
  try {
    storage.setItem(
      DEMO_CLOCK_STORAGE_KEY,
      JSON.stringify({
        version: DEMO_CLOCK_STORAGE_VERSION,
        clock,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
