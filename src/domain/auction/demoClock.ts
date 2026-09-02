export type DemoClockState =
  | {
      readonly status: "paused";
      readonly elapsedMs: number;
    }
  | {
      readonly status: "running";
      readonly elapsedMs: number;
      readonly resumedAtEpochMs: number;
    };

function isNonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function normalizeWallTime(wallTimeMs: number): number {
  return isNonNegativeSafeInteger(wallTimeMs) ? wallTimeMs : 0;
}

function addElapsedTimeSafely(elapsedMs: number, deltaMs: number): number {
  if (deltaMs <= 0) {
    return elapsedMs;
  }

  return elapsedMs > Number.MAX_SAFE_INTEGER - deltaMs
    ? Number.MAX_SAFE_INTEGER
    : elapsedMs + deltaMs;
}

export function createDemoClock(): DemoClockState {
  return {
    status: "paused",
    elapsedMs: 0,
  };
}

export function getDemoElapsedMs(
  state: DemoClockState,
  wallTimeMs: number,
): number {
  if (state.status === "paused") {
    return state.elapsedMs;
  }

  const normalizedWallTime = normalizeWallTime(wallTimeMs);
  const deltaMs = Math.max(0, normalizedWallTime - state.resumedAtEpochMs);

  return addElapsedTimeSafely(state.elapsedMs, deltaMs);
}

export function startDemoClock(
  state: DemoClockState,
  wallTimeMs: number,
): DemoClockState {
  if (state.status === "running") {
    return state;
  }

  return {
    status: "running",
    elapsedMs: state.elapsedMs,
    resumedAtEpochMs: normalizeWallTime(wallTimeMs),
  };
}

export function pauseDemoClock(
  state: DemoClockState,
  wallTimeMs: number,
): DemoClockState {
  if (state.status === "paused") {
    return state;
  }

  return {
    status: "paused",
    elapsedMs: getDemoElapsedMs(state, wallTimeMs),
  };
}

export function resetDemoClock(): DemoClockState {
  return createDemoClock();
}
