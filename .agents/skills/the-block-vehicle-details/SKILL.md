---
name: the-block-vehicle-details
description: Implement or review The Block vehicle-detail route, gallery, facts, seller information, return navigation, and auction-panel composition.
---

# The Block vehicle details

Work primarily in `src/features/vehicle-detail/`, shared vehicle presentation
components, `src/data/vehicles.ts`, and `e2e/vehicle-detail.spec.ts`.

- Resolve the route through the typed data boundary and retain an accessible,
  useful not-found state for missing or unknown vehicle identifiers.
- Preserve the originating inventory or My Bids URL, including query criteria,
  in router state. Accept only safe internal return paths and fall back to the
  inventory route.
- Keep gallery selection local to the detail view and route image rendering
  through the shared fallback component.
- Compose `src/features/auction/AuctionPanel.tsx`; do not recreate auction
  pricing, reserve, timing, or outcome logic in the detail feature.
- Present supplied facts explicitly, including condition, damage, title,
  location, and dealership, while never exposing the numeric reserve.
- Cover changes to route handling, return navigation, gallery accessibility,
  facts, and auction presentation in `e2e/vehicle-detail.spec.ts`; use the
  auction-action journey when the changed behavior performs a buyer action.
