import {
  type DemoClockState,
  pauseDemoClock,
  resetDemoClock,
  startDemoClock,
} from "../domain/auction/demoClock";

export type DemoClockAction =
  | {
      readonly type: "demo-clock-started";
      readonly wallTimeMs: number;
    }
  | {
      readonly type: "demo-clock-paused";
      readonly wallTimeMs: number;
    }
  | {
      readonly type: "demo-clock-reset";
    };

export function demoClockReducer(
  state: DemoClockState,
  action: DemoClockAction,
): DemoClockState {
  switch (action.type) {
    case "demo-clock-started":
      return startDemoClock(state, action.wallTimeMs);
    case "demo-clock-paused":
      return pauseDemoClock(state, action.wallTimeMs);
    case "demo-clock-reset":
      return resetDemoClock();
  }
}
