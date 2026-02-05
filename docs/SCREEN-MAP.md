# SCREEN-MAP.md — Playbooked (MVP)

**Navigation decision (locked):** If `planned_trade_id` exists on Event detail, show **“View planned trade”** and do **not** show **“Create Paper Trade.”**

---

## Navigation model

### Desktop (authenticated)
Top nav: **Dashboard | Events | Watchlist | Trades | Templates | Logout**

### Mobile (authenticated)
Drawer: **Dashboard, Events, Watchlist, Trades, Templates, Logout**

### Public (unauthenticated)
Header: **Log in | Sign up**

---

## Public / Auth

### Landing + demo
- **Route:** `/`
- **Auth:** No
- **Primary actions:** Sign up, Log in
- **Key states:** Static

### Sign up
- **Route:** `/signup`
- **Auth:** No
- **Primary actions:** Create account
- **Key states:**
  - Loading (submit)
  - **422** validation
  - **409** duplicate
  - Success → redirect

### Log in
- **Route:** `/login`
- **Auth:** No
- **Primary actions:** Log in
- **Key states:**
  - Loading (submit)
  - **401** invalid credentials
  - **422** missing fields
  - **403** CSRF refresh prompt
  - Success → redirect

---

## Dashboard

### Weekly dashboard
- **Route:** `/dashboard`
- **Auth:** Yes
- **Primary actions:** Go to Events, Go to Trades
- **Key states:**
  - Loading
  - Empty: no scored attempts (`process_score_week` = N/A)
  - Empty: no closed trades (`win_rate` / `avg_pnl` = N/A)
  - Includes `planned_conflicts_this_week`

---

## Watchlist

### Watchlist list
- **Route:** `/watchlist`
- **Auth:** Yes
- **Primary actions:** Add ticker, Edit tags, Delete, Create event
- **Key states:**
  - Loading
  - Empty
  - Errors: **422**, **409** duplicate, **404**, **401**

---

## Events

### Upcoming events list
- **Route:** `/events`
- **Auth:** Yes
- **Primary actions:** Open event detail
- **Key states:**
  - Loading
  - Empty
  - Error: **401**

### Create event
- **Route:** `/events/new?watchlist_item_id=:id`
- **Auth:** Yes
- **Primary actions:** Save event
- **Key states:**
  - Loading
  - Errors: **422**, **404**, **401**

### Event detail (server-driven `planned_trade_id`)
- **Route:** `/events/:event_id`
- **Auth:** Yes
- **Primary actions:**
  - Mark completed
  - Create playbook (if templates exist)
  - Edit playbook (unless locked)
  - If `planned_trade_id` is null: Create Paper Trade
  - If `planned_trade_id` exists: View planned trade
- **Key states:**
  - Blocking: templates empty
  - Conflict: `planned_trade_id` exists (Create hidden)
  - Locked: `playbook_locked` after any trade opens
  - Errors: **401 / 403 / 404 / 409** `already_completed` / **422** gate errors

**Contract (locked):**
- `GET /api/events/:id` → `200 { data: { event, watchlist_item, playbook_summary, planned_trade_id }, message? }`

---

## PaperTrades

### Trades list
- **Route:** `/trades`
- **Auth:** Yes
- **Primary actions:** Open trade detail
- **Key states:**
  - Loading
  - Empty
  - Error: **401**

### Trade detail (locks playbook on OPEN)
- **Route:** `/trades/:trade_id`
- **Auth:** Yes
- **Primary actions:**
  - Edit plan fields (planned/open)
  - Mark OPEN (planned) with confirmation modal
  - Close (open)
  - Cancel (planned/open)
- **Key states:**
  - Loading
  - **422** validation
  - **409** invalid_transition
  - **401 / 403 / 404**

---

## Templates

### Templates list (read-only)
- **Route:** `/templates`
- **Auth:** Yes
- **Primary actions:** View template accordion
- **Key states:**
  - Loading
  - Empty
  - Error: **401**
