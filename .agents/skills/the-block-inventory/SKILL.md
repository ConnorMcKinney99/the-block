---
name: the-block-inventory
description: Implement or review The Block inventory discovery, including search, dependent filters, price range, sorting, cards, URL state, and incremental loading.
---

# The Block inventory

Work primarily in `src/features/inventory/`; cover browser behavior in
`e2e/inventory.spec.ts`.

- Keep search, filter, price-range, and sort criteria URL-backed and
  canonicalized. Incremental visible-count state may remain local, but reset it
  whenever the effective criteria change.
- Treat dependent options as two ordered chains: make -> model and province ->
  city -> dealership. Show province before city and dealership. Disable a child
  until all of its parents are selected, clear descendants when an ancestor
  changes, and resolve deep links in dependency order so impossible values are
  removed rather than silently retained.
- Build dependent option lists from the immutable inventory constrained by the
  selected parent values. Apply the final active filters together with AND
  semantics.
- Derive price bounds, price filtering, sorting, and card prices from the same
  auction display state used by `VehicleCard`; do not fall back to raw source
  prices when an overlay changes the public price or purchase price.
- Preserve the full inventory return URL when a card opens vehicle details.
- Keep search/filter/refinement rules pure and cover them in the colocated unit
  tests. Add an inventory journey for option ordering, disabled states,
  ancestor resets, URL canonicalization, or navigation behavior that changes.
