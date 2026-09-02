import { createContext } from "react";
import type { AuctionTiming } from "../domain/auction/auctionLifecycle";
import type {
  AuctionOverlay,
  BuyNowTransitionAccepted,
  BuyNowTransitionRejected,
  MaximumBidTransitionAccepted,
  MaximumBidTransitionRejected,
} from "../domain/auction/types";
import type { Vehicle } from "../domain/vehicle/types";

export interface PersistedMaximumBidTransitionAccepted
  extends MaximumBidTransitionAccepted {
  readonly persisted: boolean;
}

export type BuyerMaximumSubmissionResult =
  | PersistedMaximumBidTransitionAccepted
  | MaximumBidTransitionRejected;

export interface PersistedBuyNowTransitionAccepted
  extends BuyNowTransitionAccepted {
  readonly persisted: boolean;
}

export type BuyerBuyNowResult =
  | PersistedBuyNowTransitionAccepted
  | BuyNowTransitionRejected;

export interface DemoClockSnapshot {
  readonly status: "paused" | "running";
  readonly elapsedMs: number;
}

export interface LocalPersistenceResult {
  readonly persisted: boolean;
}

export interface AuctionContextValue {
  readonly clock: DemoClockSnapshot;
  getOverlay(vehicle: Vehicle): AuctionOverlay;
  getTiming(vehicle: Vehicle): AuctionTiming;
  submitBuyerMaximum(
    vehicle: Vehicle,
    amount: number,
  ): BuyerMaximumSubmissionResult;
  completeBuyerBuyNow(vehicle: Vehicle): BuyerBuyNowResult;
  startDemoTime(): LocalPersistenceResult;
  pauseDemoTime(): LocalPersistenceResult;
  resetDemoTime(): LocalPersistenceResult;
  resetAuctionData(): LocalPersistenceResult;
}

export const AuctionContext = createContext<AuctionContextValue | null>(null);
