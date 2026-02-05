# FLOWS.md — Playbooked (MVP)

## Locked MVP decisions (source of truth)

- Templates are checklist/help only (Option A). Playbook fields are fixed: `thesis`, `key_metrics`, `invalidation_rule`, `max_loss_percent`, `checklist_state`.
- Process Gate is hard-blocked (G1–G5). Every “Create Paper Trade” click logs a **GateAttempt**.
- One **planned** PaperTrade per playbook (server is source of truth; enforced via locked DB method below).
- **Playbook lock trigger (LOCKED):** A playbook becomes locked the first time **ANY** PaperTrade for that playbook transitions to **OPEN**.
- Auth: cookie-based sessions + double-submit CSRF.
- Status codes policy: **401 / 403 / 404 / 409 / 422** reflected in UI handling and copy.
- Timezones: store all timestamps in UTC; display user-local with UTC offset label format, e.g. `13:00 (UTC+0)`.
- Planned trade is created minimal/empty; plan fields are completed on Trade Detail before marking **OPEN**.
- If no templates exist, Playbook creation is hard-blocked (no template picker shown).
- Conflict standardization (LOCKED):
  - User-input duplicates use **409** `conflict_type="duplicate"` (signup email, watchlist ticker).
  - Existence/race conflicts use **409** `conflict_type="already_exists"` (playbook 1:1 already exists).
- GateAttempt scoring: planned-exists clicks are excluded from `process_score_week` and counted separately as `planned_conflicts_this_week`.

---

## Response contracts (so FE doesn’t guess)

### Success Response Contract (canonical)
- **200 OK (list/detail):** `{ data: <object|array>, message?: string }`
- **201 Created (create trade):** `{ trade_id: string, redirect_url: string, message: string }`

### API Error Contract (locked)

**Standard fields (all errors)**
- `message: string` (always present, user-safe)
- `code?: string` (optional internal code)

**422 Unprocessable Entity (validation)**
Rules:
- `message` is always present.
- `field_errors` and `gate_errors` can both appear in one response.

Payload may include:
- `field_errors?: { [field: string]: string }`
- `gate_errors?: Array<{ gate: "G1"|"G2"|"G3"|"G4"|"G5", passed: false, message: string }>`
- `passed_gate_count?: number` (0–5) when gate_errors present

UI rendering rules:
- Field errors → inline at field + summary at top of form.
- Gate errors → Gate Panel on Event detail.

**409 Conflict (state conflict)**
- `message: string` (always present)
- `conflict_type: "planned_trade_exists" | "playbook_locked" | "already_completed" | "duplicate" | "invalid_transition" | "already_exists"`
Optional:
- `planned_trade_id?: string` (when `planned_trade_exists`)
- `redirect_url?: string`

**401 / 403 / 404**
- **401** Unauthorized: missing/expired session → login flow
- **403** Forbidden: wrong user / not admin / CSRF fail → access denied or refresh prompt
- **404** Not Found: resource missing → not found UI

---

## Event detail SUCCESS contract (locked)

**Endpoint:** `GET /api/events/:id`  
**Response:** `200 { data: { event, watchlist_item, playbook_summary, planned_trade_id }, message? }`

Where:
- `event`: `{ event_id, user_id, status, event_type, event_datetime_utc, notes? }`
- `watchlist_item`: `{ watchlist_item_id, ticker, tags_json }`
- `playbook_summary` (nullable if no playbook):
  - `{ playbook_id, template_name, passed_gate_count }`
- `planned_trade_id` (nullable):
  - string if a planned trade exists for this playbook, else null

UI rule:
- Event detail must rely on `planned_trade_id` from this payload to decide whether to show **Create** vs **View Planned**.

---

## DB enforcement: one planned trade per playbook (locked method)

**Locked choice: Postgres partial unique index**
- Enforce at DB level:
  - Unique index on `paper_trades(playbook_id)` WHERE `status='planned'`
- Server still handles conflict gracefully:
  - If insert violates the unique index, respond **409** `conflict_type="planned_trade_exists"` and include the existing `planned_trade_id`.

---

## GateAttempt fields: planned-exists branch (locked)

For GateAttempts where `blocked_by_existing_planned_trade=true`:
- `gate_results = null`
- `passed_gate_count = null`
- `total_gates = 5`
- `all_passed = false`
- `created_paper_trade_id = null`
- Gate evaluation is skipped.

These attempts are excluded from `process_score_week` and counted in `planned_conflicts_this_week`.

---

## Process score definition (updated)

- Week window: Monday 00:00 → Sunday 23:59 (UTC).
- Included attempts: GateAttempts where `blocked_by_existing_planned_trade=false`.
- `process_score_week = average(passed_gate_count / total_gates) * 100` over included attempts in the week.
- If no included attempts: `process_score_week = N/A` (“No scored attempts this week.”)
- Additional stat:
  - `planned_conflicts_this_week = count(GateAttempts where blocked_by_existing_planned_trade=true in the week)`

---

## Create Paper Trade endpoint (locked behavior)

**Endpoint:** `POST /api/paper-trades`  
**Inputs:** `{ playbook_id: string }`

Server behavior:
1) Always creates a GateAttempt record per click.
2) If a planned trade exists:
   - Create GateAttempt with blocked flag (fields per contract above).
   - Return **409** `conflict_type="planned_trade_exists"` + `planned_trade_id`.
3) Else evaluate gates G1–G5:
   - If fail: return **422** `gate_errors` + `passed_gate_count`.
4) Else create planned trade (minimal fields):
   - Return **201** `{ trade_id, redirect_url, message }`.

Client behavior:
- Disable Create button immediately on click.
- On **409** planned exists, replace with **“View planned trade”**.

---

## 1) First visit (public) → demo preview → signup/login

- `/` → demo preview → CTA signup/login → success redirect `/dashboard`.

---

## 2) Register/login/logout + session expired handling (401)

### Register
- `/signup` → submit.
- Success → `/dashboard`.

Errors:
- **422**: invalid email/password
- **409** `conflict_type="duplicate"`: “Account already exists. Log in instead.”

### Login
- `/login` → submit.
- Success → `/dashboard`.

Errors:
- **401**: “Email or password is incorrect.”
- **422**: missing fields
- **403**: CSRF refresh prompt

### Logout
- Logout → redirect `/`.

### Session expired
- Any authed API returns **401** → route to `/login` (preserve return_to) with banner “Your session expired…”

---

## 3) Watchlist: add ticker + tags + edit/delete + errors

### Add ticker
- `/watchlist` → add panel → submit.

Validations:
- ticker regex `^[A-Z0-9.-]{1,10}$`
- tags: max 10, each ≤ 20 chars, non-empty

Errors:
- **422** `field_errors`
- **409** `conflict_type="duplicate"`: “That ticker is already in your watchlist.”

---

## 4) Events: create from watchlist + upcoming feed + mark completed

### Create event
- `/events/new?watchlist_item_id=:id` → save.

### Upcoming feed
- `/events` lists status=upcoming.

### Mark completed
- `/events/:id` → mark completed.
- already completed → **409** `conflict_type="already_completed"`.

---

## 5) Playbook: create 1:1 + edit + checklist + gate preview + lock behavior

### Create playbook
- `/events/:id` → “Create playbook”
- If templates empty: hard-block message.
- Else template picker → create.

Errors:
- **422** missing template selection
- **409** `conflict_type="already_exists"`: “Playbook already exists — opening it now.”

### Edit playbook
- Editable until lock trigger occurs.
- `key_metrics` caps:
  - max 20 metrics
  - each ≤ 80 chars

### Lock
- Locks the first time ANY trade for this playbook transitions to OPEN.
- After locked: playbook edits return **409** `conflict_type="playbook_locked"`.

---

## 6) Create Paper Trade attempt (3 branches) + GateAttempt logging

Event detail uses `planned_trade_id` from `GET /api/events/:id`.
- If `planned_trade_id` exists: hide Create, show “View planned trade”.

Branches:
- **422**: `gate_errors` + `passed_gate_count` (GateAttempt logged and scored)
- **409** planned exists: `planned_trade_id` returned (GateAttempt logged, excluded from score)
- **201**: returns `trade_id` + `redirect_url` (GateAttempt linked)

---

## 7) PaperTrade lifecycle: planned→open→closed/cancelled + invalid transition

Planned trade creation:
- Created minimal/empty.
- User completes plan fields on trade detail.

### Planned → Open (with confirmation)
- User clicks “Mark OPEN”.
- Show confirm modal:
  - “Opening this trade locks your playbook. Continue?”
  - Buttons: Cancel / Continue
- If Continue:
  - Validate required plan fields.
  - If missing → **422** `field_errors`.
  - If ok → status becomes OPEN and playbook locks.

Invalid transitions:
- Return **409** `conflict_type="invalid_transition"` and no status change.

### Open → Closed
- Requires `pnl_percent` (-100..1000).
- Win if `pnl_percent > 0`.

### Cancel
- planned/open → cancelled requires `cancel_reason`.

---

## 8) Dashboard weekly stats: empty states + refresh correctness

Dashboard shows This week (UTC) stats:
- `process_score_week` (excludes planned_conflicts)
- `planned_conflicts_this_week`
- `closed_trade_count`, `win_rate`, `avg_pnl`

Empty:
- No scored attempts: `process_score_week` N/A
- No closed trades: `win_rate` / `avg_pnl` N/A

Refresh correctness:
- values match server after refresh.
