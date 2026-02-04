# REQUIREMENTS.md — Playbooked (MVP)

## 0) Summary
Playbooked is a paper-trading workflow that forces a pre-trade **Process Gate** and turns decisions into measurable learning. Users build a watchlist, create events, complete a 1:1 playbook from a template, and attempt to create paper trades. Paper trades are **hard-blocked** unless all gates pass. Each “Create Paper Trade” click is recorded as a **GateAttempt** for weekly Process score analytics. Outcomes are **manual** (no ingestion).

---

## 1) Roles & permissions

### Investor (MVP)
- Can register/login/logout
- Can CRUD: WatchlistItems, Events, Playbook (with locking rules), PaperTrades
- Can view Templates (pre-seeded system templates, read-only)
- GateAttempts are created automatically on trade attempts
- Can view Dashboard (weekly stats)

### Admin (MVP)
- Can manage Templates (create/update) via admin-only endpoint or seed script
- Cannot delete Templates that are referenced by any Playbook
- Can view basic system overview endpoints (optional UI)

**Admin creation rule (locked)**
- Admin accounts are seeded manually (DB seed / environment bootstrap).
- No public admin signup exists in MVP.

### Coach (Future, NOT MVP)
- Publish templates, review playbooks, feedback/annotations

**Authorization rules**
- All user-owned resources are strictly scoped by `user_id`
- Investor cannot read/update/delete other investors’ resources
- Templates are global read-only for Investor
- Admin can access all resources

---

## 2) HTTP status code policy (locked)
Use these status codes consistently across the API:

- **401 Unauthorized**: no valid session
- **403 Forbidden**: authenticated but not allowed (wrong user / not admin)
- **404 Not Found**: resource does not exist (or not visible due to scoping)
- **409 Conflict**: state conflict (e.g., playbook locked, planned trade already exists, 1:1 constraint violated)
- **422 Unprocessable Entity**: validation errors (field-level issues)

Error response shape (recommended):
- `message` (string)
- `field_errors` (object of field -> string) optional
- `code` (string) optional

---

## 3) Template approach (MVP) — Explicit decision
**Chosen option: Option A.**

**Template = checklist + labels/help only.**  
Playbook fields are fixed columns:
- `thesis` (text)
- `key_metrics` (list)
- `invalidation_rule` (text)
- `max_loss_percent` (numeric decimal percentage)
- `checklist_state` (JSON map)

### Template edit/delete rules (locked)
- Templates may be created/updated by Admin.
- Templates cannot be deleted if referenced by any Playbook (FK restriction or app rule).
- Template checklist edits must not break existing playbooks:
  - If checklist items are added, existing playbooks treat new items as unchecked until user checks them.
  - If checklist items are removed, existing playbooks treat them as not required for G5.

---

## 4) Timezone & datetime storage (locked)
- Store all datetimes in the database as UTC.
- Weekly stats use UTC Monday 00:00 → Sunday 23:59.
- UI displays datetimes in the user’s local timezone (browser locale) while preserving UTC storage.

---

## 5) Core data & rules (MVP)

### Entities (logical)
- User
- WatchlistItem (unique per user+ticker; tags stored as JSON array)
- Event (references WatchlistItem via watchlist_item_id)
- Template (pre-seeded; read-only for Investor)
- Playbook (exactly 1 per Event; references Template via template_id)
- PaperTrade (lifecycle: planned/open/closed/cancelled)
- GateAttempt (created on each attempt to create a paper trade)

### Constraints / invariants
- WatchlistItem: unique(user_id, ticker)
- Event: must store watchlist_item_id; event.user_id must match watchlist_item.user_id
- Playbook: unique(event_id) (enforces Event ↔ Playbook 1:1)
- PaperTrade creation:
  - Allowed only when gates pass
  - Created with status planned
  - Idempotency rule: only one planned PaperTrade per playbook at a time
- Templates: seeded by Admin/script; read-only for Investor

### Event datetime/status rule (locked)
- Event can be created with any datetime (past or future)
- Default status=upcoming
- User manually sets status=completed
- Upcoming feed filters by status=upcoming (not by datetime)

### Ticker validation rule (locked)
- Normalize ticker to uppercase, trim whitespace
- Must match regex: ^[A-Z0-9.-]{1,10}$
- Enforce unique(user_id, ticker)

### Playbook locking policy (locked, with unlock path)
- Editable if there are no PaperTrades for it.
- Locked if any PaperTrade exists, except:
  - If the only existing PaperTrade is status=planned and the user cancels it, the Playbook becomes editable again.
- If any PaperTrade is open/closed/cancelled (or multiple trades exist), Playbook remains read-only.

Locked edit attempts must return **409 Conflict**.

### PaperTrade ticker snapshot rule (locked)
- PaperTrade.ticker is denormalized as a snapshot for historical integrity.
- On creation, set paper_trades.ticker = watchlist_items.ticker.

---

## 6) Process Gate definition (hard-block)

Thresholds are global constants in MVP.

- G1 Thesis present: thesis length >= 200 chars (trimmed)
- G2 Key metrics: key_metrics count >= 1
- G3 Invalidation rule present: invalidation_rule length >= 50 chars (trimmed)
- G4 Max loss present: max_loss_percent is not null and > 0
- G5 Checklist complete:
  - Required checklist items come from the current Template checklist
  - G5 passes if all currently-required template items are checked true

Hard-block behavior:
- If any gate fails: PaperTrade is NOT created
- UI returns failed gates + requirements
- A GateAttempt is still recorded

---

## 7) GateAttempt logging & weekly Process score

### GateAttempt creation (required)
A GateAttempt is created every time the user clicks Create Paper Trade.

GateAttempt stores:
- id
- user_id
- event_id
- playbook_id
- attempted_at (UTC)
- passed_gate_count (0–5)
- total_gates (=5)
- gate_results JSON (per-gate pass/fail + reason if failed)
- all_passed boolean
- created_paper_trade_id nullable
- blocked_by_existing_planned_trade boolean

### Weekly Process score
- Week = Monday 00:00 to Sunday 23:59 (UTC)
- process_score_week = average(passed_gate_count / total_gates) * 100 over all attempts in that week
- If no attempts: score=N/A

---

## 8) Outcome definitions (locked)
- A **win** is a closed trade with `pnl_percent > 0`.
- A **loss** is a closed trade with `pnl_percent < 0`.
- A **flat** result is a closed trade with `pnl_percent = 0`.
- Win rate = wins / closed_trade_count (for the selected period)

---

## 9) User stories & acceptance criteria (MVP)

### 9.1 Authentication & account (cookie session + explicit CSRF)
Auth strategy (locked): Cookie-based sessions
- Session stored in secure, HttpOnly cookie
- Cookie flags in production: HttpOnly, Secure, SameSite=Lax
- Session rotation on login; logout invalidates session

CSRF approach (locked): Double-submit CSRF token
- Server issues a csrf_token cookie (NOT HttpOnly) on login/session creation
- Client sends csrf_token on every state-changing request as X-CSRF-Token header
- Server validates header token matches cookie token
- All non-GET requests require CSRF validation

Story A1
- As an Investor, I can create an account and log in so that my watchlist and trades are private and saved.

Acceptance criteria
- Register with email + password (>= 8 chars), stored hashed
- Login sets session cookie; persists across refresh
- Logout invalidates session
- Duplicate email => 422
- Invalid credentials => 401 (generic message)
- Unauthenticated access to protected routes => 401

---

### 9.2 Templates (read-only for Investor; admin-managed)
Story T1
- As an Investor, I can view templates so that I can choose the checklist structure for my playbook.

Acceptance criteria
- Logged-in users can list templates
- Investor cannot create/edit/delete templates => 403
- If no templates exist, playbook creation blocked with clear message

Story T2 (Admin)
- As an Admin, I can create/update templates so that the system provides usable checklists.

Acceptance criteria
- Admin-only endpoints require admin role; non-admin => 403
- Admin can create templates with checklist_items[]
- Admin can update checklist items
- Deleting a template referenced by any playbook => 409 Conflict

---

### 9.3 Watchlist + tags
Story W1
- As an Investor, I can add a ticker to my watchlist so that I can create events for it.

Acceptance criteria
- Ticker normalized to uppercase; must match ^[A-Z0-9.-]{1,10}$
- Duplicate ticker for same user => 409 Conflict
- Validation failures (empty/regex/length) => 422
- Accessing another user’s watchlist item => 404 or 403 (prefer 404 to avoid enumeration)

Story W2
- As an Investor, I can tag tickers so that I can organize my watchlist.

Acceptance criteria
- tags_json is JSON array of strings
- Trim tags; reject empty => 422
- Max 10 tags; max 20 chars each => 422

---

### 9.4 Events + upcoming feed + gate summary
Story E1
- As an Investor, I can create an event from a watchlist item so that I can prepare for a catalyst.

Acceptance criteria
- Must reference existing watchlist_item_id owned by user; else => 404/403
- Default status=upcoming
- event_datetime stored as UTC
- Validation errors => 422

Story E2
- As an Investor, I can view upcoming events so that I know what to work on next.

Acceptance criteria
- Upcoming feed filters status=upcoming
- Sorted by event_datetime ascending
- Shows gate summary X/5
- Empty state CTA if none

---

### 9.5 Playbook (1:1) + locking/unlock path
Story P1
- As an Investor, I can create the single playbook for an event from a template so that my planning is structured.

Acceptance criteria
- Exactly one playbook per event; creating a second => 409 Conflict
- Requires template_id; missing => 422
- Owner-only access

Story P2
- As an Investor, I can edit playbook fields and checklist so that I can pass the Process Gate.

Acceptance criteria
- Draft saves allowed even if gates fail
- key_metrics items cannot be empty strings => 422
- Gate preview shows per-gate pass/fail

Story P3
- As an Investor, I cannot edit a playbook once trading activity exists so that I can’t rewrite history.

Acceptance criteria
- If playbook is locked, any edit attempt => 409 Conflict and no data changes
- If only trade is planned and user cancels it, playbook becomes editable again
- UI disables inputs when locked and shows banner

---

### 9.6 Process Gate hard-block + attempts + idempotent planned trade
Story G1
- As an Investor, when I click Create Paper Trade, the system evaluates the gate and records the attempt so that my Process score is measurable and trades are blocked unless complete.

Acceptance criteria
- Every click creates one GateAttempt
- If planned trade already exists for playbook:
  - No new trade; return 409 Conflict
  - GateAttempt.blocked_by_existing_planned_trade=true
- Else evaluate gates:
  - If any fail: return 422 with failed gates + requirements; no trade created
  - If all pass: create PaperTrade status=planned; return 201 Created
- Concurrency: server must enforce “one planned per playbook” reliably

---

### 9.7 PaperTrade lifecycle + cancellation + manual outcomes
Story TR1
- As an Investor, I can manage a paper trade lifecycle so that my practice is organized.

Acceptance criteria
- planned → open blocked unless entry_plan/stop_rule/take_profit_rule/position_size are present; missing => 422
- Invalid transition (e.g., closed→open, cancelled→open) returns error (409) and does not change status
- open → closed requires pnl_percent; missing => 422
- planned → cancelled requires cancel_reason; missing => 422
- open → cancelled allowed; requires cancel_reason

Story TR2
- As an Investor, I can manually log outcomes and a post-mortem so that I learn.

Acceptance criteria
- Outcome logging is manual
- Free text fields are stored but never logged (see analytics rules)
- Closing without notes allowed but prompts reminder

---

### 9.8 Dashboard (weekly stats)
Story D1
- As an Investor, I can view weekly stats so that I can measure process and outcomes.

Acceptance criteria
- Shows this week (UTC):
  - process_score_week, attempt_count
  - closed_trade_count, win_rate, avg_pnl
- Empty states:
  - No attempts => process score N/A
  - No closed trades => win rate/avg pnl N/A
- Correctness:
  - Stats must match underlying data after refresh (no client-side cached mismatch)

---

## 10) Non-functional requirements (MVP-level)

### Security
- Password hashing, server-side validation, strict authorization
- Cookie sessions: HttpOnly, Secure (prod), SameSite=Lax
- Double-submit CSRF for all non-GET
- Rate limiting on auth endpoints
- Display: “Educational only / not financial advice / paper trading only”

### Accessibility (testable checklist)
- All controls keyboard reachable
- Visible focus states
- Labels wired correctly
- Errors announced via aria-live
- Contrast check on primary UI meets WCAG AA (text)

### Performance
- Indexed queries for upcoming events, dashboard, attempts
- Must handle standard dataset sizes without timeouts

### Reliability
- Consistent error schema; graceful UI errors; DB constraints for uniqueness/1:1

### Logging & analytics (safe by design)
- Never log free-text fields (thesis/invalidation/outcome/post-mortem/plan fields)
- Log only IDs, event_type, gate counts, statuses, timestamps
- Avoid raw request body logging in production

---

## 11) DB indexes & constraint notes (required)

### Required indexes
- events(user_id, status, event_datetime)
- gate_attempts(user_id, attempted_at)
- paper_trades(user_id, status, created_at)
- paper_trades(user_id, closed_at)

### Required constraints (DB preferred)
- WatchlistItem unique(user_id, ticker)
- Playbook unique(event_id)
- GateAttempt passed_gate_count between 0 and 5; total_gates=5
- PaperTrade:
  - pnl_percent required if status=closed
  - opened_at <= closed_at when closed
  - one planned trade per playbook (partial unique index if supported; else transactional enforcement)

---

## 12) Out of scope (explicitly NOT MVP)
- Market data/news/earnings ingestion
- Brokerage integration
- Auto event detection
- Community/sharing
- Coach features
- AI recommendations
- Advanced analytics
- Native mobile apps

---

## 13) Scope structure
### MVP (must ship)
- Auth (cookie sessions + double-submit CSRF) + locked HTTP status codes
- Templates (seeded; investor read-only; no delete if used; removed items not required)
- Watchlist + tags + ticker regex validation
- Events (any datetime; default upcoming; manual completed) + upcoming feed + gate summary
- Playbook (1:1) + fixed fields + checklist + locking with cancel-unlock path
- Process Gate hard-block + GateAttempt logging + one planned trade per playbook
- PaperTrade lifecycle + manual outcomes + strict transition errors
- Weekly dashboard (UTC) with correctness on refresh

### v1
- Date range dashboard + trends
- Private custom templates (user-created)
- CSV import
- Reminders

### Backlog
- Coach role + publishing + reviews
- Sharing links
- Integrations and auto pre-fill
- Exports and advanced stats