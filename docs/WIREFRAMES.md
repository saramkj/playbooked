# WIREFRAMES.md — Playbooked (MVP)

**Timezone label format (locked):** display local time with UTC offset, e.g. `13:00 (UTC+0)`.

---

## Contracts to avoid FE guessing

### Success Contract
- **200 (list/detail):** `{ data, message? }`
- **201 (create trade):** `{ trade_id, redirect_url, message }`

### Error Contract (locked)
- All errors: `message` is **always present**
- **422** can include **both**:
  - `field_errors` (map) and/or
  - `gate_errors` (list) + `passed_gate_count`
  - UI rule:
    - Field errors → inline + form summary
    - Gate errors → Gate Panel
- **409** includes `conflict_type` + optional `planned_trade_id`

### Event detail success contract (locked)
- `GET /api/events/:id` → `200 { data: { event, watchlist_item, playbook_summary, planned_trade_id }, message? }`
- `playbook_summary` (nullable): `{ playbook_id, template_name, passed_gate_count }`

---

## Global UI rules (responsive + accessible)

### Responsive
- Mobile-first
- Desktop upgrades to **two-column layout** on:
  - Event detail
  - Trade detail

### Forms
- aria-live error summary at top
- inline field errors under inputs
- focus error summary on submit failure

### Modals
- focus trap
- restore focus to triggering control on close

### Accessibility baseline
- visible focus states
- WCAG AA contrast for text and primary UI

---

## 1) Landing — `/`

**Flow:** Hero → Demo preview → How it works → Compliance

### Demo preview includes
- Gate list (G1–G5) with failed examples
- Disabled “Create Paper Trade” button

---

## 2) Sign up — `/signup`

### Auth card
- Email (required)
- Password (min 8)
- CTA: Create account

### Errors
- **422** validation
- **409** `conflict_type="duplicate"`:
  - “Account already exists. Log in instead.”

---

## 3) Log in — `/login`

### Auth card
- Email
- Password
- CTA: Log in

### Errors
- **401** incorrect credentials
- **422** missing fields
- **403** CSRF refresh prompt

---

## 4) Dashboard — `/dashboard`

### Cards
- Process score (This week UTC; excludes planned_conflicts)
- Scored attempts (optional)
- Planned conflicts this week
- Closed trades
- Win rate (wins = closed pnl > 0)
- Avg P/L

### Empty banners
- No scored attempts → “No scored attempts this week.”
- No closed trades → “No closed trades this week.”

---

## 5) Watchlist — `/watchlist`

### Add ticker panel
- Ticker (uppercase, regex `^[A-Z0-9.-]{1,10}$`)
- Tags (max 10, each ≤ 20 chars)
- CTA: Add

### List rows
- Create event
- Edit tags
- Delete

### Errors
- **409** `conflict_type="duplicate"` for ticker duplicates

---

## 6) Events list — `/events`

### Event cards show
- Ticker
- Type
- Datetime (local + `UTC±offset`)
- Gate summary “X/5”
- CTA: Open

### Empty states
- No watchlist → CTA: Watchlist
- No upcoming events → CTA: Watchlist

---

## 7) Create Event — `/events/new?watchlist_item_id=:id`

### Form
- Event type (required)
- Datetime (required, stored UTC)
- Notes (optional)

---

## 8) Event detail — `/events/:event_id`

**Server-driven planned state:** uses `planned_trade_id` from event detail payload.

### Layout
- Left: Event card + Mark completed
- Right: Playbook panel + Gate panel + Trade actions

### Trade actions (locked nav decision)
- If `planned_trade_id` exists:
  - Banner: “Planned trade already exists.”
  - CTA: “View planned trade”
  - **No** Create button
- Else:
  - CTA: “Create Paper Trade”

### Gate panel
- G1–G5 list with requirement text
- On **422** `gate_errors`: highlight failed gates + show messages
- Show `passed_gate_count` as “X/5”

---

## 9) Playbook panel (inside Event detail)

### Lock trigger (locked)
- Locks the first time any PaperTrade transitions to **OPEN**
- Editable until locked (planned does not lock)

### Fields
- Thesis textarea (G1 ≥ 200)
- Key metrics list input:
  - max 20 metrics
  - each ≤ 80 chars
  - no empty metric
- Invalidation rule textarea (G3 ≥ 50)
- Max loss percent numeric (G4 > 0)
- Checklist (from template) (G5 100%)

### Locked state
- Inputs disabled
- Banner: “Playbook locked because a trade is open.”
- Any attempted edit → **409** `conflict_type="playbook_locked"`

---

## 10) Trades list — `/trades`

### Cards
- Ticker snapshot
- Status pill
- Created time (local + `UTC±offset`)
- CTA: Open

---

## 11) Trade detail — `/trades/:trade_id`

### Plan fields (planned/open)
- entry_plan (required to open)
- stop_rule (required to open)
- take_profit_rule (required to open)
- position_size (> 0 required to open)

### Mark OPEN (planned only) — with confirmation modal
- Modal copy: “Opening this trade locks your playbook. Continue?”
- Buttons: Cancel / Continue
- On Continue:
  - validate required fields (**422** if missing)
  - set status = open
  - playbook locks

### Close (open only)
- pnl_percent required (-100..1000)
- optional notes

### Cancel (planned/open)
- cancel_reason required

### Invalid transitions
- **409** `conflict_type="invalid_transition"`; no state change

### Win label
- After close, show Win/Loss/Flat based on pnl_percent

---

## 12) Templates — `/templates`

### Read-only accordion list
- name/type/version
- checklist items
- help text

### Empty state
- “No templates available. You can’t create a playbook yet.”
