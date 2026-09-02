---
name: the-block-auction-actions
description: Implement or review The Block maximum-bid, proxy-price, reserve, Buy It Now, and auction-panel behavior across domain rules, shared state, persistence, and UI.
---

# The Block auction actions

Coordinate changes across `src/features/auction/`, `src/domain/auction/`,
`src/state/`, and `e2e/auction-actions.spec.ts`.

- Keep transitions and validation in the browser-free auction domain. The
  provider coordinates domain calls and sparse persistence; React components
  render results and submit buyer actions only.
- Use the shared auction selectors for inventory cards, details, and My Bids so
  public price, buyer maximum, reserve status, lifecycle, and outcome cannot
  diverge between views.
- Preserve the distinction between public price and private buyer maximum. A
  public price must never decrease or exceed the leader's maximum, ties retain
  the incumbent, and only accepted participant submissions add to bid count.
- Recheck lifecycle when a maximum-bid or Buy It Now confirmation is committed,
  not only when its dialog opens. Keep the two confirmations mutually exclusive
  and return focus or announce the result accessibly.
- Store Buy It Now as a separate terminal finalization. It must use the supplied
  nullable fixed price and preserve the prior bid, maxima, leader, and bid
  count; it never implies checkout or payment.
- Extend the focused pure domain/storage tests first when rules change, then add
  or update the corresponding browser journey for user-visible behavior and
  cross-view persistence.
