# Screenshot Shot List

This is a capture plan for portfolio screenshots. The filenames below are the same ones referenced in the README so the final package stays consistent.

## General capture rules

- Use realistic seeded or local demo data.
- Prefer clean states with readable timestamps and labels.
- Avoid screenshots that expose secrets, raw IDs, or empty browser chrome noise.
- Keep the viewport consistent across the set unless a mobile view is the point of the shot.
- Capture real UI states only. Do not mock panels or edit HTML for the screenshot.

## 1. Dashboard overview

- Filename: `docs/showcase/screenshots/dashboard-weekly-stats.png`
- Screen: `/dashboard`
- What to show:
  - weekly Process score
  - win rate
  - average P/L
  - planned conflicts this week
- Why it matters:
  - shows the app is measuring actual workflow behavior, not just storing forms

## 2. Event detail with Process Gate summary

- Filename: `docs/showcase/screenshots/event-detail-process-gate.png`
- Screen: `/events/:event_id`
- What to show:
  - event information
  - playbook summary
  - gate panel with `X/5`
  - trade action area
- Why it matters:
  - this is the core screen where the workflow rule becomes visible

## 3. Playbook editing state

- Filename: `docs/showcase/screenshots/playbook-edit-state.png`
- Screen: event detail with editable playbook
- What to show:
  - thesis
  - key metrics
  - invalidation rule
  - max loss
  - checklist
- Why it matters:
  - makes it clear the app is structured around pre-trade planning

## 4. Gate failure response

- Filename: `docs/showcase/screenshots/gate-failure-panel.png`
- Screen: event detail after a blocked trade attempt
- What to show:
  - visible failed gates
  - requirement copy
  - no created trade
- Why it matters:
  - demonstrates that the Process Gate is a hard block, not a suggestion

## 5. Planned trade detail

- Filename: `docs/showcase/screenshots/trade-detail-open-lock.png`
- Screen: `/trades/:trade_id`
- What to show:
  - planned or open trade detail
  - trade plan fields
  - action to move to `open`, or the state after opening
- Why it matters:
  - shows the lifecycle beyond initial planning

## 6. Locked playbook state

- Filename: `docs/showcase/screenshots/playbook-locked-after-open.png`
- Screen: event detail after linked trade is `open`
- What to show:
  - disabled playbook inputs
  - lock banner or locked messaging
- Why it matters:
  - highlights one of the more interesting state rules in the app

## 7. Watchlist to event workflow

- Filename: `docs/showcase/screenshots/watchlist-events-entry.png`
- Screen: `/watchlist`
- What to show:
  - ticker rows
  - tags
  - action to create an event
- Why it matters:
  - gives viewers the start of the workflow, not just the middle

## 8. Templates view

- Filename: `docs/showcase/screenshots/templates-read-only.png`
- Screen: `/templates`
- What to show:
  - one or more templates
  - checklist/help structure
- Why it matters:
  - supports the explanation that templates shape guidance, not schema

## 9. Mobile responsive proof

- Filename: `docs/showcase/screenshots/mobile-event-detail.png`
- Screen: event detail on a narrow viewport
- What to show:
  - stacked layout
  - readable gate panel and actions
- Why it matters:
  - useful if the portfolio presentation needs one mobile proof point

## 10. Optional public landing screenshot

- Filename: `docs/showcase/screenshots/landing-demo-preview.png`
- Screen: `/`
- What to show:
  - demo preview
  - explanation of the gate concept
  - signup/login CTA
- Why it matters:
  - useful if the showcase package needs a simple first image before the authenticated flow

## Best order for a portfolio carousel

1. `dashboard-weekly-stats.png`
2. `event-detail-process-gate.png`
3. `gate-failure-panel.png`
4. `playbook-edit-state.png`
5. `trade-detail-open-lock.png`
6. `playbook-locked-after-open.png`

That order tells the clearest story: what the app measures, how the gate works, how the user prepares, and what changes once a trade goes live.
