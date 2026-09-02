import type { AuctionOverlay, AuctionVehicleTerms } from "./types";

export const DEMO_MINUTE_MS = 60_000;
export const DEMO_AUCTION_DURATION_MS = 60 * DEMO_MINUTE_MS;

export interface SchedulableAuctionVehicle extends AuctionVehicleTerms {
  readonly lot: string;
}

export interface AuctionSchedule {
  readonly startOffsetMs: number;
  readonly endOffsetMs: number;
}

export type AuctionLifecycle = "upcoming" | "open" | "closed";

export type SettledAuctionOutcome =
  | "buyer-purchased"
  | "buyer-won"
  | "competitor-won"
  | "no-sale"
  | "no-bids";

export interface AuctionTiming {
  readonly schedule: AuctionSchedule;
  readonly startTimeMs: number;
  readonly endTimeMs: number;
  readonly lifecycle: AuctionLifecycle;
  readonly remainingMs: number;
  readonly outcome: SettledAuctionOutcome | null;
}

const LOT_NUMBER_PATTERN = /^[A-D]-(\d{4})$/;
const MIN_DISPLAY_TIME_MS = 0;
// Keep corrupt clock data inside the range rendered by ISO and local formatters.
const MAX_DISPLAY_TIME_MS = 253_402_300_799_999;

function clampDisplayTime(valueMs: number): number {
  if (!Number.isFinite(valueMs)) {
    return MIN_DISPLAY_TIME_MS;
  }

  return Math.min(
    MAX_DISPLAY_TIME_MS,
    Math.max(MIN_DISPLAY_TIME_MS, valueMs),
  );
}

function hashLot(lot: string): number {
  return Array.from(lot).reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
}

function getClosingMinute(lot: string, currentBid: number | null): number {
  const match = LOT_NUMBER_PATTERN.exec(lot);
  const seed = match === null ? hashLot(lot) : Number(match[1]) + 19;
  const baseClosingMinute = (seed % 50) + 1;
  const isDelayedWave = baseClosingMinute > 10 && currentBid === null;

  return baseClosingMinute + (isDelayedWave ? 50 : 0);
}

export function getAuctionSchedule(
  vehicle: Pick<SchedulableAuctionVehicle, "currentBid" | "lot">,
): AuctionSchedule {
  const endOffsetMs =
    getClosingMinute(vehicle.lot, vehicle.currentBid) * DEMO_MINUTE_MS;

  return {
    startOffsetMs: endOffsetMs - DEMO_AUCTION_DURATION_MS,
    endOffsetMs,
  };
}

export function getAuctionLifecycle(
  schedule: AuctionSchedule,
  elapsedMs: number,
): AuctionLifecycle {
  if (elapsedMs < schedule.startOffsetMs) {
    return "upcoming";
  }

  return elapsedMs < schedule.endOffsetMs ? "open" : "closed";
}

export function getSettledAuctionOutcome(
  vehicle: AuctionVehicleTerms,
  overlay: AuctionOverlay,
): SettledAuctionOutcome {
  if (overlay.finalization?.type === "buy-now") {
    return "buyer-purchased";
  }

  if (overlay.publicPrice === null || overlay.leader === null) {
    return "no-bids";
  }

  if (
    vehicle.reservePrice !== null &&
    overlay.publicPrice < vehicle.reservePrice
  ) {
    return "no-sale";
  }

  return overlay.leader === "buyer" ? "buyer-won" : "competitor-won";
}

export function getAuctionTiming(
  vehicle: SchedulableAuctionVehicle,
  overlay: AuctionOverlay,
  elapsedMs: number,
  wallTimeMs = 0,
): AuctionTiming {
  const schedule = getAuctionSchedule(vehicle);
  const scheduleOriginMs = wallTimeMs - elapsedMs;
  const lifecycle =
    overlay.finalization === null
      ? getAuctionLifecycle(schedule, elapsedMs)
      : "closed";
  const targetOffsetMs =
    lifecycle === "upcoming" ? schedule.startOffsetMs : schedule.endOffsetMs;

  return {
    schedule,
    startTimeMs: clampDisplayTime(
      scheduleOriginMs + schedule.startOffsetMs,
    ),
    endTimeMs: clampDisplayTime(scheduleOriginMs + schedule.endOffsetMs),
    lifecycle,
    remainingMs:
      overlay.finalization === null
        ? Math.max(0, targetOffsetMs - elapsedMs)
        : 0,
    outcome:
      lifecycle === "closed"
        ? getSettledAuctionOutcome(vehicle, overlay)
        : null,
  };
}
