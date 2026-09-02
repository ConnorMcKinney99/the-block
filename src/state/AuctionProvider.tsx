import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { vehicles } from "../data/vehicles";
import { getAuctionTiming } from "../domain/auction/auctionLifecycle";
import { bootstrapAuction } from "../domain/auction/bootstrapAuction";
import { completeBuyNow } from "../domain/auction/buyNow";
import {
  createDemoClock,
  getDemoElapsedMs,
  type DemoClockState,
} from "../domain/auction/demoClock";
import { submitMaximumBid } from "../domain/auction/proxyBid";
import type { Vehicle } from "../domain/vehicle/types";
import { AuctionContext } from "./auctionContext";
import {
  auctionReducer,
  type AuctionOverlayState,
} from "./auctionReducer";
import { loadAuctionOverlays, saveAuctionOverlays } from "./auctionStorage";
import {
  type DemoClockAction,
  demoClockReducer,
} from "./demoClockReducer";
import { loadDemoClock, saveDemoClock } from "./demoClockStorage";
import type { KeyValueStorage } from "./storage";

interface AuctionProviderProps {
  readonly children: ReactNode;
  readonly storage?: KeyValueStorage | null;
  readonly now?: () => number;
  readonly tickIntervalMs?: number;
}

interface InitialStateInput {
  readonly storage: KeyValueStorage | null;
  readonly wallTimeMs: number;
}

const defaultNow = () => Date.now();

function getBrowserStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function initializeAuctionState({
  storage,
}: InitialStateInput): AuctionOverlayState {
  return storage === null ? {} : loadAuctionOverlays(storage, vehicles);
}

function initializeDemoClock({
  storage,
  wallTimeMs,
}: InitialStateInput): DemoClockState {
  return storage === null
    ? createDemoClock()
    : loadDemoClock(storage, wallTimeMs);
}

function getInitialWallTime(now: () => number): number {
  const sampledTime = now();
  return Number.isSafeInteger(sampledTime) && sampledTime >= 0
    ? sampledTime
    : 0;
}

export function AuctionProvider({
  children,
  storage = getBrowserStorage(),
  now = defaultNow,
  tickIntervalMs = 1_000,
}: AuctionProviderProps) {
  const [wallTimeMs, setWallTimeMs] = useState(() => getInitialWallTime(now));
  const initializationInput = useMemo(
    () => ({ storage, wallTimeMs }),
    [storage, wallTimeMs],
  );
  const [overlays, dispatchAuction] = useReducer(
    auctionReducer,
    initializationInput,
    initializeAuctionState,
  );
  const [clockState, dispatchClock] = useReducer(
    demoClockReducer,
    initializationInput,
    initializeDemoClock,
  );
  const wallTimeRef = useRef(wallTimeMs);
  const overlaysRef = useRef(overlays);
  const clockRef = useRef(clockState);
  const shouldPersistHydratedClock = useRef(clockState.status === "running");

  const readWallTime = useCallback(() => {
    const sampledTime = now();
    const safeSample =
      Number.isSafeInteger(sampledTime) && sampledTime >= 0
        ? sampledTime
        : wallTimeRef.current;
    const monotonicTime = Math.max(wallTimeRef.current, safeSample);

    wallTimeRef.current = monotonicTime;
    return monotonicTime;
  }, [now]);

  useEffect(() => {
    if (
      shouldPersistHydratedClock.current &&
      storage !== null &&
      clockState.status === "running"
    ) {
      shouldPersistHydratedClock.current = false;
      saveDemoClock(storage, clockState);
    }
  }, [clockState, storage]);

  useEffect(() => {
    const updateWallTime = () => setWallTimeMs(readWallTime());
    const intervalId = window.setInterval(
      updateWallTime,
      Math.max(100, tickIntervalMs),
    );

    document.addEventListener("visibilitychange", updateWallTime);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", updateWallTime);
    };
  }, [readWallTime, tickIntervalMs]);

  const elapsedMs = getDemoElapsedMs(clockState, wallTimeMs);

  const getOverlay = useCallback(
    (vehicle: Vehicle) => overlays[vehicle.id] ?? bootstrapAuction(vehicle),
    [overlays],
  );

  const getTiming = useCallback(
    (vehicle: Vehicle) =>
      getAuctionTiming(vehicle, getOverlay(vehicle), elapsedMs, wallTimeMs),
    [elapsedMs, getOverlay, wallTimeMs],
  );

  const submitBuyerMaximum = useCallback(
    (vehicle: Vehicle, amount: number) => {
      const currentWallTime = readWallTime();
      const currentOverlays = overlaysRef.current;
      const currentOverlay =
        currentOverlays[vehicle.id] ?? bootstrapAuction(vehicle);
      const currentElapsed = getDemoElapsedMs(
        clockRef.current,
        currentWallTime,
      );

      setWallTimeMs(currentWallTime);

      if (
        getAuctionTiming(
          vehicle,
          currentOverlay,
          currentElapsed,
          currentWallTime,
        ).lifecycle !==
        "open"
      ) {
        return {
          ok: false as const,
          code: "auction-closed" as const,
          minimumAccepted: null,
          state: currentOverlay,
        };
      }

      const result = submitMaximumBid(
        vehicle,
        currentOverlay,
        "buyer",
        amount,
      );

      if (!result.ok) {
        return result;
      }

      const nextOverlays = {
        ...currentOverlays,
        [vehicle.id]: result.state,
      };
      const persisted =
        storage !== null && saveAuctionOverlays(storage, nextOverlays);

      overlaysRef.current = nextOverlays;
      dispatchAuction({
        type: "auction-overlay-updated",
        vehicleId: vehicle.id,
        overlay: result.state,
      });

      return { ...result, persisted };
    },
    [readWallTime, storage],
  );

  const completeBuyerBuyNow = useCallback(
    (vehicle: Vehicle) => {
      const currentWallTime = readWallTime();
      const currentOverlays = overlaysRef.current;
      const currentOverlay =
        currentOverlays[vehicle.id] ?? bootstrapAuction(vehicle);
      const currentElapsed = getDemoElapsedMs(
        clockRef.current,
        currentWallTime,
      );

      setWallTimeMs(currentWallTime);

      if (
        getAuctionTiming(
          vehicle,
          currentOverlay,
          currentElapsed,
          currentWallTime,
        ).lifecycle !==
        "open"
      ) {
        return {
          ok: false as const,
          code: "auction-closed" as const,
          state: currentOverlay,
        };
      }

      const result = completeBuyNow(vehicle, currentOverlay);

      if (!result.ok) {
        return result;
      }

      const nextOverlays = {
        ...currentOverlays,
        [vehicle.id]: result.state,
      };
      const persisted =
        storage !== null && saveAuctionOverlays(storage, nextOverlays);

      overlaysRef.current = nextOverlays;
      dispatchAuction({
        type: "auction-overlay-updated",
        vehicleId: vehicle.id,
        overlay: result.state,
      });

      return { ...result, persisted };
    },
    [readWallTime, storage],
  );

  const applyClockAction = useCallback(
    (action: DemoClockAction) => {
      const nextClock = demoClockReducer(clockRef.current, action);
      const persisted =
        storage !== null && saveDemoClock(storage, nextClock);

      clockRef.current = nextClock;
      dispatchClock(action);

      return { persisted };
    },
    [storage],
  );

  const startDemoTime = useCallback(() => {
    const currentWallTime = readWallTime();
    setWallTimeMs(currentWallTime);
    return applyClockAction({
      type: "demo-clock-started",
      wallTimeMs: currentWallTime,
    });
  }, [applyClockAction, readWallTime]);

  const pauseDemoTime = useCallback(() => {
    const currentWallTime = readWallTime();
    setWallTimeMs(currentWallTime);
    return applyClockAction({
      type: "demo-clock-paused",
      wallTimeMs: currentWallTime,
    });
  }, [applyClockAction, readWallTime]);

  const resetDemoTime = useCallback(() => {
    setWallTimeMs(readWallTime());
    return applyClockAction({ type: "demo-clock-reset" });
  }, [applyClockAction, readWallTime]);

  const resetAuctionData = useCallback(() => {
    const persisted = storage !== null && saveAuctionOverlays(storage, {});

    overlaysRef.current = {};
    dispatchAuction({ type: "auction-overlays-reset" });

    return { persisted };
  }, [storage]);

  const clock = useMemo(
    () => ({ status: clockState.status, elapsedMs }),
    [clockState.status, elapsedMs],
  );

  const value = useMemo(
    () => ({
      clock,
      getOverlay,
      getTiming,
      submitBuyerMaximum,
      completeBuyerBuyNow,
      startDemoTime,
      pauseDemoTime,
      resetDemoTime,
      resetAuctionData,
    }),
    [
      clock,
      completeBuyerBuyNow,
      getOverlay,
      getTiming,
      pauseDemoTime,
      resetAuctionData,
      resetDemoTime,
      startDemoTime,
      submitBuyerMaximum,
    ],
  );

  return (
    <AuctionContext.Provider value={value}>
      {children}
    </AuctionContext.Provider>
  );
}
