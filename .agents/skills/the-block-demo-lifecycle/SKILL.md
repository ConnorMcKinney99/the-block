---
name: the-block-demo-lifecycle
description: Implement or review The Block deterministic demo clock, auction lifecycle, settlement, reset controls, and clock persistence.
---

# The Block demo lifecycle

Coordinate `src/features/demo-controls/`, the demo-clock and lifecycle modules
under `src/domain/auction/`, their reducers and storage adapters in `src/state/`,
and `e2e/demo-lifecycle.spec.ts`.

- Keep schedule, elapsed-time, lifecycle, and settlement calculations pure.
  Persist wall-time anchors and clock status, never timer ticks or fabricated
  settlement, bid-history, or purchase timestamps.
- Preserve the deterministic 60-minute schedule and prevent upcoming lots from
  displaying source bid history before they open. At reset, 110 lots are open
  and 90 are upcoming; 40 lots close in the first ten demo minutes.
- Keep resets independent: resetting time preserves auction activity, and a
  completed Buy It Now remains terminal; resetting auction data clears local
  bids and purchases while preserving demo time.
- Derive settlement only at closure from the current overlay and reserve state.
  Do not introduce background competitor simulation or browser-owned lifecycle
  rules.
- Keep the controls' panel, Escape behavior, confirmation focus, live status,
  and storage-unavailable messaging accessible.
- Cover pure clock/lifecycle and storage changes with the focused unit tests,
  then cover control, hydration, reset, deferred-activity, and settlement flows
  in `e2e/demo-lifecycle.spec.ts`.
