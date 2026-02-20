# API.md — Playbooked (Stage 5)

Base path: `/api`  
JSON keys: `snake_case`  
Timestamps: `*_at` are UTC ISO-8601 strings in responses.

---

## API overview (cookies + CSRF)

- Auth uses **cookie-based sessions**.
- All state-changing requests (POST/PUT/PATCH/DELETE) require:
  - Cookie session
  - Header `X-CSRF-Token: <value>` (double-submit; must match `csrf_token` cookie)
- If no valid session: **401**
- If forbidden (wrong role / CSRF fail): **403**
- If resource not found OR not owned (anti-enumeration): **404**
- If state conflict: **409**
- If validation fails: **422**

---

## Success response contract (canonical)

- **200 (list/detail):**
```json
{ "data": {}, "message": "optional" }
```

- **201 (create trade attempt success):**
```json
{ "trade_id": "uuid", "redirect_url": "/trades/<id>", "message": "string" }
```

---

## Error response contract (LOCKED)

### Common fields (all errors)
```json
{
  "message": "Human-readable, safe error message",
  "code": "optional_internal_code"
}
```

### 422 Validation Error (field + gate errors can both exist)

Rules:
- message is always present
- field_errors and gate_errors can both appear in one response

Example:
```json
{
  "message": "Validation failed.",
  "field_errors": {
    "ticker": "Ticker must match ^[A-Z0-9.-]{1,10}$"
  },
  "gate_errors": [
    { "gate": "G1", "passed": false, "message": "Thesis must be at least 200 characters." }
  ],
  "passed_gate_count": 2
}
```

### 409 Conflict
```json
{
  "message": "Planned trade already exists.",
  "conflict_type": "planned_trade_exists",
  "planned_trade_id": "uuid"
}
```

Valid conflict_type values (LOCKED):
- planned_trade_exists
- playbook_locked
- already_completed
- duplicate
- invalid_transition
- already_exists

### 401 Unauthorized
```json
{ "message": "Session expired. Please log in again." }
```

### 403 Forbidden (includes CSRF failures)
```json
{ "message": "Security check failed. Refresh the page and try again." }
```

### 404 Not Found (or hidden due to scoping)
```json
{ "message": "Not found." }
```

---

## Validation rules (explicit)

### Watchlist ticker + tags

**ticker**
- normalized to uppercase
- regex: `^[A-Z0-9.-]{1,10}$`
- unique per user: `unique(user_id, ticker)`
- duplicate → 409 `conflict_type="duplicate"`

**tags**
- array of strings
- max 10 tags
- each tag length 1–20 (trimmed)
- no empty strings

### Events
- event_type: enum (MVP)
  - earnings | macro | company_event | other
- event_datetime_at: required; stored as UTC
- status: upcoming | completed
  - create defaults to upcoming
  - mark completed when already completed → 409 `conflict_type="already_completed"`

### Templates (Option A)

Templates provide checklist/help only.

checklist_items is an array of:
```json
{ "id": "string", "label": "string", "help_text": "string?" }
```

Admin rule: templates cannot be deleted if referenced (delete not in MVP)

### Playbooks (fixed columns)

- thesis (text)
- key_metrics (array of strings)
  - max 20 metrics
  - each <= 80 chars, trimmed, non-empty
- invalidation_rule (text)
- max_loss_percent (numeric)
  - must be > 0
- checklist_state (map)
  - key: checklist item id
  - value: boolean checked

### Gate thresholds (evaluated on trade attempt)

- G1: thesis length >= 200
- G2: key_metrics count >= 1
- G3: invalidation_rule length >= 50
- G4: max_loss_percent > 0
- G5: checklist complete (100% checked)

### Playbook lock/unlock rules (Stage 5 LOCKED)

- Editable if no trades exist for it
- Locked if any trade exists (planned/open/closed/cancelled)
- Unlock only if:
  - the ONLY existing trade was planned AND the user cancels it
- Locked edits → 409 `conflict_type="playbook_locked"`

### Paper trades

Status enum: planned | open | closed | cancelled

- Creation: planned trade created minimal/empty (no plan fields required at creation)
- Planned → Open requires:
  - entry_plan, stop_rule, take_profit_rule non-empty
  - position_size numeric > 0
- Open → Closed requires:
  - pnl_percent numeric in range -100..1000
- Planned/Open → Cancelled requires:
  - cancel_reason non-empty
- Invalid transition → 409 `conflict_type="invalid_transition"`

Outcome:
- win if pnl_percent > 0
- loss if < 0
- flat if = 0

### GateAttempts (planned exists branch)

When blocked_by_existing_planned_trade=true:
- gate_results_json = null
- passed_gate_count = null
- total_gates = 5
- all_passed = false

---

## Concurrency & idempotency notes (critical)

- One planned trade per playbook (DB source of truth)
- Postgres partial unique index:
  - unique(playbook_id) WHERE status='planned'

The attempt endpoint must:
- check planned trade existence OR rely on unique constraint
- translate unique violation into:
  - 409 planned_trade_exists and return planned_trade_id

Attempt always logs GateAttempt (LOCKED):  
Every click creates exactly one GateAttempt record:
- gates fail → 422 + attempt logged
- planned exists → 409 + attempt logged (blocked branch)
- success → 201 + attempt logged and linked to trade

---

## Endpoints

### Auth

#### POST /api/auth/register (Public)

Creates Investor user only (admin seeded separately).

Request:
```json
{ "email": "user@example.com", "password": "min_8_chars" }
```

200 Response:
```json
{
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "role": "investor",
    "created_at": "2026-02-12T12:00:00Z"
  }
}
```

Errors:
- 422 invalid email/password
- 409 conflict_type="duplicate"

#### POST /api/auth/login (Public)

Request:
```json
{ "email": "user@example.com", "password": "..." }
```

200 Response:
```json
{
  "data": { "user_id": "uuid", "email": "user@example.com", "role": "investor" },
  "message": "Logged in."
}
```

Side effects:
- sets session cookie (HttpOnly)
- sets csrf_token cookie (NOT HttpOnly)

Errors:
- 401 invalid credentials
- 422 missing fields

#### POST /api/auth/logout (Investor/Admin)

Headers: X-CSRF-Token

200 Response:
```json
{ "data": { "ok": true }, "message": "Logged out." }
```

Errors:
- 401
- 403 (CSRF)

#### GET /api/auth/me (Investor/Admin)

200 Response:
```json
{ "data": { "user_id": "uuid", "email": "user@example.com", "role": "investor" } }
```

Errors:
- 401

---

### Templates

#### GET /api/templates (Investor/Admin)

200 Response:
```json
{
  "data": [
    {
      "template_id": "uuid",
      "name": "Earnings Playbook",
      "template_type": "earnings",
      "version": 1,
      "checklist_items": [
        { "id": "rev_growth", "label": "Check revenue growth", "help_text": "Look at YoY trends." }
      ],
      "created_at": "2026-02-12T12:00:00Z",
      "updated_at": "2026-02-12T12:00:00Z"
    }
  ]
}
```

Errors:
- 401

#### POST /api/admin/templates (Admin)

Headers: X-CSRF-Token

Request:
```json
{
  "name": "Earnings Playbook",
  "template_type": "earnings",
  "version": 1,
  "checklist_items": [
    { "id": "rev_growth", "label": "Check revenue growth", "help_text": "Look at YoY trends." }
  ]
}
```

200 Response:
```json
{ "data": { "template_id": "uuid" }, "message": "Template created." }
```

Errors:
- 401/403
- 422 invalid checklist items (missing id/label, duplicate ids)

#### PUT /api/admin/templates/:template_id (Admin)

Headers: X-CSRF-Token

Request: same shape as create (partial update allowed)

200 Response:
```json
{ "data": { "template_id": "uuid" }, "message": "Template updated." }
```

Errors:
- 404 not found
- 422 validation
- 403 forbidden

---

### Watchlist

#### GET /api/watchlist_items (Investor/Admin)

200 Response:
```json
{
  "data": [
    {
      "watchlist_item_id": "uuid",
      "ticker": "AAPL",
      "tags": ["earnings", "large-cap"],
      "created_at": "2026-02-12T12:00:00Z",
      "updated_at": "2026-02-12T12:00:00Z"
    }
  ]
}
```

Errors:
- 401

#### POST /api/watchlist_items (Investor/Admin)

Headers: X-CSRF-Token

Request:
```json
{ "ticker": "aapl", "tags": ["earnings"] }
```

200 Response:
```json
{
  "data": { "watchlist_item_id": "uuid", "ticker": "AAPL", "tags": ["earnings"] },
  "message": "Added to watchlist."
}
```

Errors:
- 422 invalid ticker/tags
- 409 conflict_type="duplicate"

#### PUT /api/watchlist_items/:watchlist_item_id (Investor/Admin)

Headers: X-CSRF-Token

Request:
```json
{ "tags": ["earnings", "watch"] }
```

200 Response:
```json
{ "data": { "watchlist_item_id": "uuid", "ticker": "AAPL", "tags": ["earnings", "watch"] } }
```

Errors:
- 401/403/404/422

#### DELETE /api/watchlist_items/:watchlist_item_id (Investor/Admin)

Headers: X-CSRF-Token

200 Response:
```json
{ "data": { "ok": true }, "message": "Deleted." }
```

Errors:
- 401/403/404

---

### Events

#### GET /api/events (Investor/Admin)

Query params:
- status=upcoming|completed (optional; default upcoming)

200 Response:
```json
{
  "data": [
    {
      "event_id": "uuid",
      "watchlist_item_id": "uuid",
      "ticker": "AAPL",
      "event_type": "earnings",
      "status": "upcoming",
      "event_datetime_at": "2026-03-01T13:00:00Z",
      "created_at": "2026-02-12T12:00:00Z"
    }
  ]
}
```

Errors:
- 401

#### POST /api/events (Investor/Admin)

Headers: X-CSRF-Token

Request:
```json
{
  "watchlist_item_id": "uuid",
  "event_type": "earnings",
  "event_datetime_at": "2026-03-01T13:00:00Z",
  "notes": "optional"
}
```

200 Response:
```json
{ "data": { "event_id": "uuid" }, "message": "Event created." }
```

Errors:
- 404 watchlist item not found/not owned
- 422 validation

#### GET /api/events/:event_id (LOCKED contract)

200 Response:
```json
{
  "data": {
    "event": {
      "event_id": "uuid",
      "status": "upcoming",
      "event_type": "earnings",
      "event_datetime_at": "2026-03-01T13:00:00Z",
      "notes": "optional",
      "created_at": "2026-02-12T12:00:00Z",
      "updated_at": "2026-02-12T12:00:00Z"
    },
    "watchlist_item": {
      "watchlist_item_id": "uuid",
      "ticker": "AAPL",
      "tags": ["earnings"]
    },
    "playbook_summary": {
      "playbook_id": "uuid",
      "template_name": "Earnings Playbook",
      "passed_gate_count": 3
    },
    "planned_trade_id": null
  }
}
```

Errors:
- 401/404

#### POST /api/events/:event_id/mark_completed (Investor/Admin)

Headers: X-CSRF-Token

200 Response:
```json
{
  "data": { "event_id": "uuid", "status": "completed", "completed_at": "2026-02-20T10:00:00Z" }
}
```

Errors:
- 401/403/404
- 409 conflict_type="already_completed"

---

### Playbooks

#### POST /api/events/:event_id/playbook (Investor/Admin)

Headers: X-CSRF-Token

Request:
```json
{ "template_id": "uuid" }
```

200 Response:
```json
{ "data": { "playbook_id": "uuid" }, "message": "Playbook created." }
```

Errors:
- 404 event not found/not owned
- 422 missing/invalid template
- 409 conflict_type="already_exists"

#### GET /api/playbooks/:playbook_id (Investor/Admin)

200 Response:
```json
{
  "data": {
    "playbook_id": "uuid",
    "event_id": "uuid",
    "template_id": "uuid",
    "template_name": "Earnings Playbook",
    "thesis": "",
    "key_metrics": [],
    "invalidation_rule": "",
    "max_loss_percent": 2.0,
    "checklist_state": { "rev_growth": false },
    "is_locked": false,
    "locked_at": null,
    "created_at": "2026-02-12T12:00:00Z",
    "updated_at": "2026-02-12T12:00:00Z"
  }
}
```

Errors:
- 401/404

#### PUT /api/playbooks/:playbook_id (Investor/Admin)

Headers: X-CSRF-Token

Request:
```json
{
  "thesis": "text...",
  "key_metrics": ["Revenue growth", "Margins"],
  "invalidation_rule": "text...",
  "max_loss_percent": 2.0,
  "checklist_state": { "rev_growth": true }
}
```

200 Response:
```json
{ "data": { "playbook_id": "uuid", "updated_at": "2026-02-12T12:30:00Z" }, "message": "Playbook saved." }
```

Errors:
- 401/403/404
- 409 conflict_type="playbook_locked"
- 422 validation

---

### Paper trades (attempt + lifecycle)

#### POST /api/paper_trades/attempt (Investor/Admin)

Headers: X-CSRF-Token

Request:
```json
{ "playbook_id": "uuid" }
```

201 Success:
```json
{ "trade_id": "uuid", "redirect_url": "/trades/uuid", "message": "Planned trade created." }
```

422 Gate failure:
```json
{
  "message": "Process Gate failed. Fix the gates to continue.",
  "gate_errors": [
    { "gate": "G1", "passed": false, "message": "Thesis must be at least 200 characters." }
  ],
  "passed_gate_count": 2
}
```

409 Planned exists:
```json
{
  "message": "Planned trade already exists.",
  "conflict_type": "planned_trade_exists",
  "planned_trade_id": "uuid"
}
```

Errors:
- 401
- 403
- 404

#### GET /api/paper_trades (Investor/Admin)

Query params: status=planned|open|closed|cancelled (optional)

200 Response:
```json
{
  "data": [
    {
      "paper_trade_id": "uuid",
      "playbook_id": "uuid",
      "ticker": "AAPL",
      "status": "planned",
      "created_at": "2026-02-12T12:00:00Z",
      "opened_at": null,
      "closed_at": null,
      "cancelled_at": null
    }
  ]
}
```

Errors:
- 401

#### GET /api/paper_trades/:paper_trade_id (Investor/Admin)

200 Response:
```json
{
  "data": {
    "paper_trade_id": "uuid",
    "playbook_id": "uuid",
    "ticker": "AAPL",
    "status": "planned",
    "entry_plan": "",
    "stop_rule": "",
    "take_profit_rule": "",
    "position_size": null,
    "pnl_percent": null,
    "cancel_reason": null,
    "outcome_notes": "",
    "post_mortem_notes": "",
    "created_at": "2026-02-12T12:00:00Z",
    "updated_at": "2026-02-12T12:00:00Z",
    "opened_at": null,
    "closed_at": null,
    "cancelled_at": null
  }
}
```

Errors:
- 401/404

#### PUT /api/paper_trades/:paper_trade_id/plan (Investor/Admin)

Headers: X-CSRF-Token

Request:
```json
{
  "entry_plan": "Buy on breakout above X",
  "stop_rule": "Stop below Y",
  "take_profit_rule": "Take profit at Z",
  "position_size": 100
}
```

200 Response:
```json
{ "data": { "paper_trade_id": "uuid" }, "message": "Plan saved." }
```

Errors:
- 401/403/404
- 409 conflict_type="invalid_transition"
- 422 validation

#### POST /api/paper_trades/:paper_trade_id/mark_open (Investor/Admin)

Headers: X-CSRF-Token

Request:
```json
{ "confirm": true }
```

200 Response:
```json
{
  "data": { "paper_trade_id": "uuid", "status": "open", "opened_at": "2026-02-12T13:00:00Z" },
  "message": "Trade opened."
}
```

Errors:
- 401/403/404
- 409 conflict_type="invalid_transition"
- 422 missing plan fields

#### POST /api/paper_trades/:paper_trade_id/close (Investor/Admin)

Headers: X-CSRF-Token

Request:
```json
{ "pnl_percent": 12.5, "outcome_notes": "optional", "post_mortem_notes": "optional" }
```

200 Response:
```json
{
  "data": {
    "paper_trade_id": "uuid",
    "status": "closed",
    "closed_at": "2026-02-20T10:00:00Z",
    "pnl_percent": 12.5,
    "outcome": "win"
  },
  "message": "Trade closed."
}
```

Errors:
- 401/403/404
- 409 conflict_type="invalid_transition"
- 422 invalid pnl_percent

#### POST /api/paper_trades/:paper_trade_id/cancel (Investor/Admin)

Headers: X-CSRF-Token

Request:
```json
{ "cancel_reason": "Changed mind; thesis not solid." }
```

200 Response:
```json
{
  "data": { "paper_trade_id": "uuid", "status": "cancelled", "cancelled_at": "2026-02-12T14:00:00Z" },
  "message": "Trade cancelled."
}
```

Errors:
- 401/403/404
- 409 conflict_type="invalid_transition"
- 422 missing cancel_reason

---

### Gate attempts (read-only)

#### GET /api/gate_attempts (Investor/Admin)

Query params (optional): from_at, to_at, playbook_id

200 Response:
```json
{
  "data": [
    {
      "gate_attempt_id": "uuid",
      "playbook_id": "uuid",
      "event_id": "uuid",
      "attempted_at": "2026-02-12T12:00:00Z",
      "blocked_by_existing_planned_trade": false,
      "passed_gate_count": 3,
      "total_gates": 5,
      "all_passed": false
    }
  ]
}
```

Errors:
- 401

---

### Dashboard

#### GET /api/dashboard/weekly (Investor/Admin)

Query params (optional):
- week_start_at (UTC ISO date at 00:00:00Z). If omitted, server uses current UTC week window.

200 Response:
```json
{
  "data": {
    "week_start_at": "2026-02-09T00:00:00Z",
    "week_end_at": "2026-02-15T23:59:59Z",
    "process_score_week": 72.0,
    "attempt_count_scored": 8,
    "planned_conflicts_this_week": 2,
    "closed_trade_count": 3,
    "win_rate": 0.6667,
    "avg_pnl_percent": 5.2
  }
}
```

Notes:
- process_score_week excludes attempts where blocked_by_existing_planned_trade=true.
- If no scored attempts: process_score_week is null (UI shows N/A).
