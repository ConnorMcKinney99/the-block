---
name: the-block-my-bids
description: Implement or review The Block My Bids grouping, empty state, shared vehicle cards, outcomes, and navigation back from vehicle details.
---

# The Block My Bids

Work primarily in `src/features/my-bids/` and `e2e/my-bids.spec.ts`, with shared
auction selectors and vehicle-card presentation as dependencies.

- Derive groups on render from immutable vehicles plus `getOverlay` and
  `getTiming`; do not persist a separate My Bids list or fabricate bid history.
- Classify buyer wins and Buy It Now purchases before checking `buyerMax`, so a
  purchase with no prior maximum still appears in Won. Put other closed
  auctions with buyer activity in Past and open or upcoming auctions with a
  saved maximum in Active.
- Use the same vehicle grid/card and auction display model as inventory so
  prices, status, and lifecycle remain synchronized.
- Preserve `/my-bids` as the return destination when opening a detail page from
  any group.
- Keep group counts, headings, and the no-activity state accessible. Exercise
  empty, active, past, auction-win, purchase-only, and return-navigation cases
  in `e2e/my-bids.spec.ts` when their behavior changes.
