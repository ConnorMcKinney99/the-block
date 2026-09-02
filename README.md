# The Block

I built The Block as a buyer-facing vehicle auction prototype using the 200
supplied records in `data/vehicles.json`. The experience covers inventory
discovery, vehicle details, proxy bidding, Buy It Now, deterministic auction
timing, and a personal bid history in a responsive dark interface.

The project is intentionally frontend-only. I focused on clear buyer workflows,
testable auction rules, synchronized UI state, local persistence, accessibility,
and a polished demonstration experience.

## Run the App

Prerequisites:

- Node.js 24.15 or newer
- npm 11 or newer

```bash
git clone https://github.com/ConnorMcKinney99/the-block.git
cd the-block
npm install
npm run dev
```

`npm install` also installs the Chromium binary used by the browser tests.

Open [http://localhost:5173](http://localhost:5173).

## Commands

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run test:unit` | Run browser-free domain, storage, and inventory tests |
| `npm run test:e2e` | Run Chromium user journeys |
| `npm run test:e2e:install` | Reinstall the Chromium test browser |
| `npm test` | Run both test layers |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run strict TypeScript checks |
| `npm run build` | Type-check and create the production bundle |
| `npm run preview` | Preview the production bundle |

## What I Built

- A 200-vehicle inventory with broad search, dependent make/model and
  province/city/dealership filters, lot filtering, a dual-handle price range,
  sorting, URL-backed criteria, and incremental loading.
- A persistent desktop filter rail and compact sticky search/sort toolbar so
  buyers can keep their criteria visible while scrolling.
- Image-led vehicle cards with condition stars, title status, auction timing,
  and starting/current price overlays. Cards open from anywhere in the tile.
- Detailed vehicle pages with a gallery, specifications, condition report,
  damage notes, title information, seller details, and auction state.
- Device-local proxy bidding that keeps the public price separate from the
  buyer's private maximum and rechecks auction state at confirmation.
- Supplied Buy It Now offers with accessible confirmation dialogs and explicit
  local finalization.
- A My Bids area for active bids, past activity, auction wins, and Buy It Now
  purchases.
- Deterministic open, upcoming, and closed auction states with local demo-time
  controls and separate resets for time and auction activity.
- A responsive dark theme with semantic reserve, title, outcome, and focus
  treatments.

## Technical Approach

I separated immutable source data, pure business rules, shared auction state,
and feature UI so the pricing logic can be tested independently of React and the
inventory and detail views always derive from the same auction state.

```text
data/vehicles.json
  -> typed vehicle adapter
  -> pure auction and lifecycle rules
  -> reducer-owned sparse overlays
  -> shared inventory, detail, and My Bids views
  -> validated versioned localStorage
```

The repository is organized as follows:

```text
src/       application source, organized by product feature and architecture layer
e2e/       real-browser Playwright journeys
data/      supplied immutable vehicle dataset
docs/      supporting project documentation
scripts/   supplied data-generation script
```

Inside `src/`, `app/` is the small composition shell, `domain/` contains
framework-independent auction rules, `state/` coordinates reducer and storage
integration, and `features/` groups the buyer workflows as `inventory`,
`vehicle-detail`, `auction`, `my-bids`, and `demo-controls`. Shared presentation
components stay in `components/`, while the package manifest, lockfile, and
build/test configuration live at the repository root.

Feature-specific Codex guidance lives in `.agents/skills/`, with one focused
repo skill for each product feature.

## Auction Assumptions

- I use a fixed CA$500 public increment for the prototype. Submitted maximums
  may be any positive safe whole-dollar CAD amount.
- Public price never decreases, never exceeds the leading maximum, and remains
  separate from the buyer's private maximum.
- Equal maximums retain the incumbent leader.
- Reserve affects clearing price and status but never disables bidding or adds
  a bid-count event. The numeric reserve is never shown.
- Only accepted participant submissions increment bid count. Automatic proxy
  responses and leader maximum raises do not.
- Buy It Now uses only the supplied fixed price and preserves the prior auction
  state for display.

I left `data/vehicles.json` and `scripts/generate_vehicles.mjs` unchanged.

## Persistence and Scope

I persist only locally changed auction overlays in a validated, versioned
browser schema. Invalid or unsupported storage falls back safely to the supplied
vehicle state. Demo time is persisted separately using wall-time anchors.

This prototype does not include a backend, authentication, payments, checkout,
seller tools, server synchronization, or live competitor simulation. A
production version would require a server-authoritative auction service,
durable event storage, concurrency control, auditability, secure live updates,
fraud controls, and settlement integrations.

## Quality

The final verification run passed:

- 142 browser-free tests covering auction rules, lifecycle, storage, search,
  filtering, sorting, price refinement, and incremental loading.
- 40 Chromium journeys covering inventory, details, My Bids, bidding, Buy It
  Now, timing, persistence failures, image fallback, keyboard behavior, routes,
  dialogs, and mobile layout.
- ESLint, strict TypeScript checks, and the production Vite build.

I used semantic landmarks and forms, visible focus, a skip link, descriptive
labels and image fallbacks, live status messages, text-plus-color state cues,
native confirmation dialogs, and responsive layouts throughout the experience.

## AI Assistance

I used Claude to develop the initial plan and Codex for iterative
implementation, review, and testing while retaining responsibility for the
product direction and final decisions.
