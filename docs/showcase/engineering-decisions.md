# Engineering Decisions

This file is for the portfolio version of the project. It explains the decisions that shaped Playbooked without pretending every choice was novel. Most of the interesting work here came from translating product rules into backend guarantees.

## 1. The Process Gate is enforced on the server

The central product rule is simple: no paper trade unless the playbook passes all five gates.

That could have been implemented as a frontend-only check, but that would make the rule soft. In Playbooked, gate evaluation happens server-side when the user attempts to create a trade. If a gate fails, the API returns `422` with structured `gate_errors`, and the trade is not created.

Why this matters:

- The rule is real even if the frontend has a bug.
- The same source of truth drives both the user experience and the analytics.
- It keeps the app honest as a workflow tool instead of turning the gate into a suggestion.

## 2. Every trade attempt logs a GateAttempt

One of the project’s key ideas is that process quality should be measurable, not just described.

Because of that, every click on "Create Paper Trade" creates a `GateAttempt`, even when the attempt is blocked. That includes failed gate checks and the "planned trade already exists" branch.

Why this matters:

- Weekly stats come from real user actions.
- Failed attempts are part of the learning loop, not discarded noise.
- It creates an audit trail for how often users were ready versus how often they tried to skip ahead.

There is also a deliberate nuance here: attempts blocked because a planned trade already exists are counted separately from scored attempts so they do not distort the weekly Process score.

## 3. One planned trade per playbook is enforced in the database

This rule is easy to describe and easy to get wrong.

Instead of relying only on an application-level pre-check, Playbooked uses a Postgres partial unique index for `status='planned'`. The API still handles the conflict gracefully and returns `409 conflict_type="planned_trade_exists"`, but the database is the final source of truth.

Why this matters:

- It closes race conditions in concurrent requests.
- It prevents duplicate planned trades even if two requests land at nearly the same time.
- It lets the API return a user-friendly conflict while still relying on a hard constraint underneath.

## 4. Playbooks lock on OPEN, not on PLANNED

The app allows a user to create a planned trade without immediately freezing the playbook. The lock happens only when a linked trade moves to `open`.

That is a small product decision with a noticeable UX effect:

- Users can still adjust the playbook while they are preparing.
- Once the trade is live, the record becomes historically meaningful and should not drift.
- If the only linked trade is cancelled before it ever opens, the playbook can become editable again.

This ended up being a better fit than locking earlier, because it preserves flexibility before commitment and integrity after commitment.

## 5. Templates are intentionally limited

Templates in this project are checklist/help only. They do not define arbitrary form schemas.

That constraint was a deliberate simplification:

- The app keeps a stable playbook model with fixed fields.
- Gate logic stays predictable.
- Existing playbooks are easier to reason about when templates evolve.

It also reduces the chance of turning an MVP workflow product into a generic form builder too early.

## 6. The API status code policy is strict on purpose

Playbooked uses a narrow set of status codes consistently: `401`, `403`, `404`, `409`, and `422`.

That matters because the app has several different kinds of failure:

- unauthenticated user
- forbidden action or CSRF failure
- resource not found or hidden by ownership scoping
- state conflict
- validation or gate failure

Keeping those branches explicit made both the frontend and the backend easier to reason about. It also makes the project easier to talk through in an interview because each failure mode has a clear contract.

## 7. UTC storage with local display is not optional

Events, trade timestamps, and weekly stats all depend on time behaving consistently.

The repo docs lock this decision:

- store datetimes in UTC
- calculate weekly windows in UTC
- display times in the user’s local timezone with an offset label

That avoids a common class of bugs where the UI, backend, and analytics disagree about what week an action belongs to.

## 8. Cookie-session auth was chosen for the workflow shape

This project uses cookie-based sessions with Redis-backed session storage and double-submit CSRF.

That stack is not trendy for its own sake. It fits the product:

- the app is a logged-in workflow tool, not a public API platform
- session-based auth keeps the browser flow straightforward
- Redis-backed sessions work across multiple backend instances
- CSRF protection is required once state-changing requests rely on cookies

The result is a setup that feels more like a real web app than a token demo.

## 9. The dashboard stats are real, but intentionally narrow

The weekly dashboard tracks process score, win rate, average P/L, and planned-trade conflicts.

That scope is deliberate. The project is trying to measure discipline around decision-making, not simulate a full brokerage analytics suite.

The important part is that the numbers are computed from actual `GateAttempt` and closed-trade data. They are not placeholders and they are not static showcase content.

## 10. Why these decisions matter in a portfolio context

The strongest part of this project is not the number of screens. It is the way the product rules are carried all the way through the stack:

- data model
- API contracts
- error handling
- workflow states
- analytics

That is the part worth discussing with hiring managers. The project shows product thinking, backend discipline, and a willingness to encode business rules where they actually belong.
