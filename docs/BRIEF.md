# BRIEF — Playbooked (Working Title)

## One-liner
This app helps retail investors plan event-driven paper trades with discipline by hard-blocking trade plans unless a structured playbook passes a strict Process Gate.

## Problem
Casual investors often act on earnings/news hype without a repeatable process. They don’t define invalidation, ignore max-loss rules, and learn slowly because decisions and outcomes aren’t captured in a consistent structure.

## Target users
1) Beginner-to-intermediate retail investors who want discipline and a repeatable workflow.  
2) Finance-curious students/grads who want to practice decision-making safely.  
3) (Future) Coaches/mentors who want to share playbook templates.

## Value proposition
A paper-trading workflow that forces a pre-trade Process Gate and turns your decisions into measurable learning:
- Build an Event Playbook before you’re allowed to plan a trade.
- Enforce core risk thinking (invalidation + max loss) every time.
- Review outcomes + post-mortems and track weekly process quality over time.

## How it works (short)
Users add tickers to a watchlist, create an upcoming event, and generate exactly one playbook for that event from a template. The playbook must pass 5 named Process Gates (thesis, metrics, invalidation, max loss, checklist) before a paper trade plan can be created. After the event, users manually log outcomes and write a post-mortem. A weekly dashboard shows performance and a Process score trend.

## Why it’s different (the twist)
Paper trades are hard-blocked unless the playbook passes the Process Gate (G1–G5). This forces discipline and makes “good process” measurable through a weekly Process score.

## Positioning / compliance note
Educational tool for process discipline; not investment advice; paper trading only.  
MVP outcomes are user-entered (no earnings/news ingestion yet).

## Success metrics
1) Playbook completion rate: % of events where the playbook passes all gates (target: 60%+).  
2) Learning loop rate: % of closed paper trades that include a post-mortem (target: 50%+).  
3) Process improvement: Increase in weekly Process score over 4 weeks (target: +20 points).

## MVP features (3–6)
1) Watchlist + tags (JSON array)  
2) Events (created from watchlist) + upcoming feed + gate summary  
3) Templates + Playbook creation (Event ↔ Playbook is 1:1)  
4) Process Gate hard-block (G1–G5)  
5) PaperTrade lifecycle + manual outcome logging + weekly dashboard  

---

## Appendix A — Real workflow (step-by-step user journey)

### Roles
- **Investor (MVP):** builds watchlists, creates events + playbooks, attempts paper trades, logs outcomes, reviews weekly stats.
- **Coach (Future):** can publish templates and review playbooks (not in MVP).

### User journey (10 steps)
1. First visit → preview: Investor lands on the homepage and sees a demo Event + Playbook showing the “Process Gate” concept and what gets unlocked once it’s passed.
2. Sign up + onboarding: Investor creates an account and selects a learning goal (e.g., “stop impulsive trades”) and a default max-loss preference (editable later).
3. Create a WatchlistItem: Investor adds a ticker (e.g., AAPL) and optional tags (e.g., “Large cap”, “Tech”).
4. Create an Event from the watchlist: Investor clicks a watchlist item → “Create Event,” selects event type (earnings/macro/news/other) and sets the event date/time.
5. Create the Event’s Playbook (1:1): On the event page, the app creates exactly one Playbook for that event (MVP rule) and asks the investor to select a Template.
6. Fill the playbook template fields: Investor completes Thesis, Key metrics, Invalidation rule, and Max loss percent, plus the template checklist.
7. Attempt to create a PaperTrade plan: Investor clicks “Create Paper Trade.” The app evaluates the Process Gate.
8. Hard-block until gates pass: If any gate fails, the app blocks trade creation and shows exactly which gates failed and what’s required to pass.
9. Plan created → lifecycle starts: Once gates pass, the paper trade is created with status `planned`. Investor can later mark it `open` (when they “enter”), and later `closed` or `cancelled`.
10. Manual outcome logging + weekly review: After the event/trade, the investor manually enters the outcome and post-mortem notes. Weekly dashboard shows win rate, average P/L, and a Process score trend.

> MVP outcomes are user-entered (no earnings/news ingestion yet).

---

## Appendix B — Data model (entities)

### 1) User
**Key fields:**  
`id, email, password_hash, role (INVESTOR), created_at`  
`learning_goal, default_max_loss_percent`  

**Relationships:**  
User has many WatchlistItems, Events, Playbooks, PaperTrades

### 2) WatchlistItem
**Key fields:**  
`id, user_id, ticker, tags_json, created_at`  

**Constraint:** unique(user_id, ticker)

**Relationships:**  
WatchlistItem belongs to User  
WatchlistItem has many Events

### 3) Event
**Key fields:**  
`id, user_id, watchlist_item_id, event_type, event_datetime, notes, status (upcoming/completed), created_at`

**Relationships:**  
Event belongs to User  
Event belongs to WatchlistItem  
MVP rule: Event has exactly one Playbook

### 4) Template
**Key fields:**  
`id, name, template_type, version, schema_json, required_fields, checklist_items, created_at`

**Relationships:**  
Template has many Playbooks

### 5) Playbook
**Key fields:**  
`id, user_id, event_id, template_id`  
`thesis, key_metrics, invalidation_rule, max_loss_percent`  
`checklist_state, process_gate_passed, created_at, updated_at`

**Relationships:**  
Playbook belongs to User  
Playbook belongs to Event  
Playbook belongs to Template  
Playbook has many PaperTrades

**MVP constraint:** unique(event_id) on Playbook (enforces 1:1 Event ↔ Playbook)

### 6) PaperTrade
**Key fields:**  
`id, user_id, playbook_id, ticker`  
`status (planned/open/closed/cancelled)`  
`entry_plan, stop_rule, take_profit_rule, position_size`  
`pnl_percent (nullable until closed)`  
`planned_at, opened_at, closed_at`  
`outcome_notes, post_mortem_notes, created_at`

**Lifecycle:** planned → open → closed/cancelled

---

## Appendix C — Process Gate (G1–G5)

### Gates
- **G1:** Thesis present (length ≥ 200 characters)
- **G2:** Key metrics (count ≥ 1)
- **G3:** Invalidation rule present (length ≥ 50 characters)
- **G4:** Max loss percent present (> 0)
- **G5:** Checklist complete (100% of template checklist items marked true)

### MVP behavior (hard-block)
If any gate fails, PaperTrade creation is blocked (no “skipped gates”).

### Process score (weekly)
`process_score_week = average(passed_gate_count / total_gates) * 100` over all trade creation attempts in that week.

### Two core queries the app must support
1) Upcoming events with playbook readiness (template name + failing gates)  
2) Weekly learning summary (process_score_week + win rate + avg pnl)
