# MVP-CHECKLIST.md — Playbooked (Build Sequence)

This is the prioritized build order for the MVP. Follow top to bottom.

---

## 1) Foundation (repo, DB, auth, templates, time)

- [ ] Initialize repo with backend + frontend + env config (dev/prod)
- [ ] Store all datetimes in UTC; display datetimes in the UI using the user’s local timezone
- [ ] Create DB schema with constraints:
  - [ ] `unique(user_id, ticker)` on WatchlistItem
  - [ ] `unique(event_id)` on Playbook (enforces 1:1 Event ↔ Playbook)

- [ ] Add required DB indexes:
  - [ ] `events(user_id, status, event_datetime)`
  - [ ] `gate_attempts(user_id, attempted_at)`
  - [ ] `paper_trades(user_id, status, created_at)`
  - [ ] `paper_trades(user_id, closed_at)`

- [ ] Seed Admin account manually (no public admin signup)
- [ ] Implement cookie-session auth (`HttpOnly`/`Secure`/`SameSite=Lax`) with session rotation on login
- [ ] Implement double-submit CSRF:
  - [ ] `csrf_token` cookie (not HttpOnly)
  - [ ] `X-CSRF-Token` header required on all non-GET requests
- [ ] Lock API status code policy (401/403/404/409/422) + standard error response schema
- [ ] Implement registration/login/logout with hashed passwords + rate limiting on auth
- [ ] Implement authorization middleware enforcing `user_id` scoping for all resources

- [ ] Seed Templates (>= 2) with `checklist_items` + help text
- [ ] Implement Admin template create/update + block delete if used by any playbook
- [ ] Implement template checklist edit rules:
  - [ ] Added items become required
  - [ ] Removed items are not required
- [ ] Implement Templates read-only API + Templates list UI (with empty state)

---

## 2) Core workflow (watchlist → event → playbook)

- [ ] Implement WatchlistItem CRUD API (ticker normalize + regex validation + `tags_json` + duplicate blocking)
- [ ] Build Watchlist UI (list / add / edit tags / delete / empty state)

- [ ] Implement Event APIs (create from `watchlist_item_id`, default `upcoming`, manual `completed`, UTC storage)
- [ ] Build Events UI:
  - [ ] Create event
  - [ ] Upcoming feed filtered by `status=upcoming`
  - [ ] Event detail shows gate summary

- [ ] Implement Playbook APIs enforcing 1:1 with Event + template selection
- [ ] Build Playbook UI (fixed fields + checklist + per-gate preview)

---

## 3) Process Gate + attempts + idempotency + playbook locking/unlock

- [ ] Implement Process Gate evaluator (global thresholds + explicit failure reasons)
- [ ] Implement GateAttempt creation on every “Create Paper Trade” click (store per-gate results JSON)

- [ ] Enforce server-side idempotency: **one planned PaperTrade per playbook**
- [ ] Implement “Create Paper Trade” endpoint with locked status codes:
  - [ ] Planned trade exists → **409** + `GateAttempt.blocked_by_existing_planned_trade=true`
  - [ ] Gates fail → **422** + GateAttempt saved (no trade created)
  - [ ] Gates pass → **201** + planned trade created + GateAttempt linked

- [ ] Implement playbook locking rules:
  - [ ] Lock when any trade exists
  - [ ] Unlock only if the *only* trade was `planned` and it gets cancelled
- [ ] Update UI states:
  - [ ] Disable “Create Paper Trade” when a planned trade exists
  - [ ] Show lock/unlock banners

---

## 4) PaperTrade lifecycle + cancellation + outcomes

- [ ] Implement PaperTrade plan update endpoint
- [ ] Enforce planned → open required fields:
  - [ ] `entry_plan`
  - [ ] `stop_rule`
  - [ ] `take_profit_rule`
  - [ ] `position_size`

- [ ] Enforce invalid transitions return **409** and do not change status
- [ ] Implement open → closed requiring `pnl_percent` (range validation) and win definition (`pnl_percent > 0`)
- [ ] Implement planned → cancelled requiring `cancel_reason`
- [ ] Implement open → cancelled requiring `cancel_reason`
- [ ] Ensure cancelling the only planned trade unlocks playbook edits
- [ ] Keep `paper_trades.ticker` snapshot on creation
- [ ] Build PaperTrade UI (plan editor + open/close/cancel + manual outcome/post-mortem)

---

## 5) Dashboard + QA + accessibility + safe analytics

- [ ] Implement weekly stats (UTC):
  - [ ] `process_score_week`
  - [ ] attempt count
  - [ ] closed trade count
  - [ ] win rate
  - [ ] average P/L

- [ ] Ensure dashboard correctness on refresh (no cached mismatch)
- [ ] Build Dashboard UI with empty states (no attempts / no closed trades)

- [ ] Implement safe analytics logging:
  - [ ] Log IDs/statuses/gate counts only
  - [ ] Never log free text (thesis, invalidation, notes, post-mortems, plans)

- [ ] Add global “Educational only / not financial advice / paper trading only” banner/footer

- [ ] Verify accessibility checklist:
  - [ ] All controls keyboard reachable
  - [ ] Visible focus states
  - [ ] Labels wired correctly
  - [ ] Errors announced via aria-live
  - [ ] Contrast check on primary UI

- [ ] Add consistent API error schema + UI error handling (network/validation/permissions)
