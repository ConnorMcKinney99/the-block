# How I Used AI on The Block

I used AI throughout this project as a planning, implementation, and review
tool. I remained responsible for the product direction, stack, scope,
tradeoffs, and final acceptance of the work.

## Planning With Claude

I started by deciding that I wanted to build a frontend-only React and
TypeScript application with Vite. I also established the initial buyer
experience, the visual direction, and the major phases I wanted the work to
follow.

I used Claude as a planning partner to expand those decisions into a detailed,
fully fleshed-out implementation plan. That process helped me think through the
application structure, auction behavior, state boundaries, persistence,
testing strategy, accessibility, and the order in which the features should be
built. The plan intentionally broke the project into stages so I could validate
the foundation before adding more complex auction behavior.

The phases were planned from the beginning around this progression:

1. Inspect the supplied repository and vehicle data before changing anything.
2. Build the inventory, search and filtering, vehicle cards, and detailed view.
3. Add pure auction rules, buyer bidding, shared state, and local persistence.
4. Add auction timing, settlement, Buy It Now, and My Bids.
5. Harden the browser experience, improve accessibility and responsiveness,
   refine the visual design, and complete final verification.

I treated that output as an implementation guide rather than a one-time prompt.
It gave the project a clear direction while still leaving room to adjust the
details as I used and reviewed the application.

## Iterative Implementation With Codex

I passed the plan to Codex and used it as the primary implementation partner.
Codex first inspected the repository and dataset, then implemented the project
phase by phase instead of attempting the entire application in one pass.

The development process was iterative by design. After each phase, I reviewed
the working result, identified what needed to change, and gave Codex the next
set of product and UX adjustments. For example, the inventory evolved to add a
persistent filter rail, sticky search and sorting, incremental loading, richer
image overlays, condition ratings, and title status. The auction experience
then evolved through proxy bidding, local persistence, lifecycle handling,
Buy It Now, My Bids, confirmation dialogs, and card/detail synchronization.

Codex helped me:

- inspect the supplied data and identify auction edge cases;
- implement the React UI and framework-independent TypeScript auction rules;
- keep inventory, details, and My Bids synchronized through shared selectors;
- review storage validation, keyboard behavior, accessibility, and responsive
  layouts;
- build browser-free rule tests and real Chromium user journeys;
- refine the project structure and regression coverage.

I used the running application and automated results to guide each iteration.
When something did not read clearly or work the way I expected, I adjusted the
requirement and had Codex update the implementation and regression coverage.

## Time Investment

I spent about three hours getting the site to a functional state. Once the core
experience was working, I got a little carried away and spent another three
hours adding additional features and polish.

## Quality Controls and Final Review

I kept the supplied dataset and generator unchanged, required the auction rules
to remain independent of React, and used one shared display model across cards,
details, and My Bids.

Each major implementation pass included linting, strict TypeScript checking,
relevant automated tests, and a production build. I also reviewed the desktop
and mobile layouts during the final UI work. The finished project passed 142
browser-free tests, 40 Chromium journeys, ESLint, strict TypeScript checks, and
the production build.

Claude helped me turn my initial direction into a detailed plan, and Codex
helped me execute and refine that plan iteratively. AI accelerated the work and
surfaced useful edge cases, but I retained ownership of the requirements,
prioritization, product decisions, and final result.
