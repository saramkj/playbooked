# AUTH.md — Playbooked (Stage 5)

## Roles (MVP)

- **Investor (MVP):** normal user. Builds watchlist, creates events, creates playbooks, attempts paper trades, logs outcomes, views dashboard.
- **Admin (MVP):** seeded manually. Can create/update templates. No public admin signup.
- **Coach (Future):** not in MVP (no publishing/review features).

---

## Permissions matrix (MVP)

| Resource | Investor | Admin |
|---|---|---|
| Auth (register/login/logout/me) | ✅ (self) | ✅ (self) |
| Templates (list) | ✅ | ✅ |
| Templates (create/update) | ❌ | ✅ |
| Watchlist items (CRUD) | ✅ (owned) | ✅ (owned; no cross-user admin tools in MVP) |
| Events (CRUD + mark completed) | ✅ (owned) | ✅ (owned; no cross-user admin tools in MVP) |
| Playbooks (create/get/update) | ✅ (owned; update blocked when locked) | ✅ (owned; update blocked when locked) |
| Paper trades (list/get/update/transition) | ✅ (owned) | ✅ (owned) |
| Gate attempts (list) | ✅ (owned) | ✅ (owned) |
| Dashboard (weekly) | ✅ (self) | ✅ (self) |

---

## Scoping rules (anti-enumeration)

For any user-owned resource (`watchlist_items`, `events`, `playbooks`, `paper_trades`, `gate_attempts`):
- If the requester does not own it, the API returns **404 Not Found** (not 403) to avoid resource enumeration.

**403 is reserved for:**
- CSRF failures
- True role restrictions (e.g., non-admin trying to create/update templates)

---

## Session + CSRF flow (double-submit)

### Session (cookie-based)
- On successful login:
  - Server sets a session cookie (**HttpOnly; Secure in prod; SameSite=Lax**).
  - Session state lives in **Redis** (multi-instance safe).
- On logout:
  - Server destroys the session in Redis and clears cookies.

### CSRF (double-submit)
- Server sets `csrf_token` cookie (**NOT HttpOnly**).
- Client reads `csrf_token` and sends header `X-CSRF-Token` for all **non-GET** requests.
- Server compares header token to cookie token:
  - missing/mismatch → **403**

---

## HTTP status code policy (locked)

- **401**: no valid session (expired/missing)
- **403**: forbidden (wrong role) OR CSRF check fails
- **404**: not found OR hidden due to scoping (preferred for non-owned resources)
- **409**: state conflict (playbook locked, planned trade exists, 1:1 violation, invalid transitions, duplicates)
- **422**: validation errors

### Conflict types (locked)
- `duplicate` (user-input duplicates: email, watchlist ticker)
- `already_exists` (existence/race conflicts: playbook 1:1 already exists)
- `planned_trade_exists`
- `playbook_locked`
- `already_completed`
- `invalid_transition`

---

## Admin creation rule (locked)

- Admin accounts are **seeded manually** (no public admin signup).
- Admin role cannot be escalated via API in MVP.

---

## Playbook lock/unlock rules (locked for Stage 5)

- Playbook is editable if **no trades exist** for it.
- Playbook is locked if **any trade exists** (planned/open/closed/cancelled).
- Unlock only if:
  - the ONLY existing trade was `planned`, and the user cancels it (`planned → cancelled`)
- Locked edit attempts must return:
  - **409** `conflict_type="playbook_locked"`

---

## Security notes (pragmatic)

### Password hashing
- Use a modern password hash (**argon2 recommended**).
- Never store plaintext passwords.

### Rate limiting
- Apply rate limits to:
  - `/api/auth/login`
  - `/api/auth/register`

### What MUST NOT be logged (locked)
Never log free-text user content:
- playbook text: `thesis`, `invalidation_rule`
- trade plan/outcome/post-mortem text
- cancel reasons

Log only:
- IDs, timestamps, statuses, gate counts, `conflict_type`, `event_type`

### Data minimization in errors
- Use 404 for non-owned resources (no “exists but forbidden” leaks).
- Keep error messages user-safe and non-revealing.