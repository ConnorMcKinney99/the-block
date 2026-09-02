# The Block

## How to Run

The application lives in the `app` folder. You will need Node.js 24.15 or newer
and npm 11 or newer.

```bash
git clone https://github.com/ConnorMcKinney99/the-block.git
cd the-block/app
npm install
npm run test:e2e:install
npm run dev
```

The site will be available at [http://localhost:5173](http://localhost:5173).
The Playwright install is only needed for the browser tests, but I included it
in the setup so the whole project is ready to verify after cloning.

To run the full verification suite from `app/`:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Time Spent

I did not keep an exact timer, so I do not want to make up an hour total. I
worked on the project in a series of focused passes: first understanding the
dataset and the buyer flow, then building inventory and vehicle details,
followed by the auction rules and persistence, and finally testing, responsive
polish, and documentation.

My priority was to get the core experience working correctly before adding
extra features. Once browsing, details, and bidding were stable, I added the
auction lifecycle, Buy It Now, My Bids, and the final visual treatment.

## Assumptions and Scope

I treated this as a buyer-facing prototype rather than a production auction
platform. The experience models one buyer on one device, and all changes are
stored locally in the browser.

- I left the supplied vehicle dataset and generator unchanged.
- I used a CA$500 public bid increment. That was a prototype assumption based
  on the shape of the supplied auction data, not an OPENLANE policy.
- I keep the public bid separate from the buyer's private maximum and never show
  the numeric reserve.
- I normalized the synthetic timestamps into a deterministic local demo clock
  so open, upcoming, and closed auctions can be demonstrated reliably.
- Buy It Now uses only the supplied fixed price and closes that local demo
  auction. It does not represent checkout, payment, or ownership transfer.
- I intentionally did not build authentication, seller tools, payments, a
  backend, real-time competitor bidding, or cross-device synchronization.

## Stack

- **Frontend:** React 19, React Router 7, TypeScript 6, Vite 8, and CSS Modules
- **Backend:** None. This is a frontend-only prototype.
- **Database:** None. I use validated, versioned `localStorage` for device-local
  auction activity and demo time.

I used Playwright Test for both the browser-free logic tests and the Chromium
user journeys, with ESLint and strict TypeScript checks for code quality.

## What I Built

I built a complete buyer flow around the 200 supplied vehicles. Buyers can
search and filter the inventory, open any vehicle card, inspect its photos and
details, place a maximum bid, use an eligible Buy It Now offer, and then follow
their activity from My Bids.

The inventory includes dependent make/model filters, lot and location filters,
a price range, sorting, URL-backed search criteria, and incremental loading.
The desktop filter rail and search/sort controls stay available while the list
scrolls. Vehicle cards are image-focused and show condition stars, title
status, auction timing, and bid pricing directly on the preview.

The detail experience includes a gallery, specifications, condition report,
damage notes, dealership information, reserve status, auction timing, and clear
Bid and Buy It Now confirmation dialogs. My Bids separates active activity,
past activity, and vehicles won or purchased. I also added a responsive dark
theme and made the experience work across desktop and mobile layouts.

## Notable Decisions

- **I kept the auction rules outside React.** Proxy pricing, reserve behavior,
  bid counts, Buy It Now, timing, and settlement are pure TypeScript rules. That
  made the important behavior easier to test and reason about.
- **I used one shared auction display model.** Inventory cards, vehicle details,
  and My Bids all derive from the same selectors, so the public price, reserve
  status, bid count, and buyer outcome stay synchronized.
- **I kept the supplied data immutable.** Local activity is stored as a small
  per-vehicle overlay and validated again when the application loads. Corrupt
  or unsupported browser data falls back safely to the supplied baseline.
- **I kept inventory criteria in the URL.** Search, filters, price, and sorting
  survive detail navigation without being mixed into the shared auction state.
- **I made incremental loading accessible.** Results load automatically near
  the viewport, but there is still a visible Load More button for keyboard use
  and environments without `IntersectionObserver`.
- **I used confirmation dialogs for irreversible actions.** Bid and Buy It Now
  actions recheck the current auction lifecycle when the buyer confirms, which
  protects the exact-deadline case instead of trusting stale UI state.

## Testing

The final automated suite has 178 passing tests:

- 140 browser-free tests cover proxy-bid transitions, reserve boundaries, bid
  counts, auction lifecycle math, Buy It Now, storage validation and tampering,
  search, filters, price refinement, sorting, and incremental loading.
- 38 Chromium journeys cover inventory, vehicle details, My Bids, maximum bids,
  Buy It Now, exact-deadline rejection, demo controls, refresh persistence,
  corrupt and unavailable storage, image failure, keyboard behavior,
  confirmation dialogs, routing, and mobile layout.

The final run also passed ESLint, strict TypeScript checking, and the production
Vite build. I used roles and labels in the browser tests, cleared local storage
between scenarios, and replaced external image requests so the test results do
not depend on network image availability.

## What I'd Do With More Time

The biggest next step would be replacing the browser-owned auction state with a
server-authoritative service. I would add authenticated bidders, durable bid
events, idempotent commands, concurrency controls, audit history, secure live
updates, and proper auction settlement.

On the product side, I would test the bidding and reserve language with real
buyers, replace the placeholder media with an optimized image pipeline, and add
watchlists and notifications if research showed they were useful. I would also
expand the automated checks to more browsers and physical devices and add
dedicated accessibility, performance, and visual-regression testing.
