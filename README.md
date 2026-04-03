# Playbooked

This app helps retail investors build discipline by forcing a pre-trade process before they can create a paper trade.

## What it does (MVP)

- Watchlist with tagged tickers
- Events (earnings/macro/news) created from watchlist items
- 1:1 Playbook per event, created from a template
- Process Gate hard-block (must pass 5 gates before a paper trade can be planned)
- Paper trade lifecycle (planned → open → closed/cancelled) with manual outcomes
- Weekly dashboard: win rate, avg P/L, and Process score

## Compliance note

Educational tool for process discipline; not investment advice; paper trading only.

## Accessibility notes

- Added semantic app-shell landmarks with a keyboard-visible skip link and route-change focus targeting the main page heading.
- Strengthened visible focus styles across links, buttons, inputs, textareas, and selects.
- Replaced nested link/button patterns with single semantic interactive elements and improved form field error associations with `aria-invalid` and `aria-describedby`.

Manual checks to run:

- Navigate the app using keyboard only, including the skip link, primary nav, auth actions, and page-level CTA links.
- Confirm focus moves to the main heading after each SPA route change.
- Submit each form with invalid or empty required values and verify the visible error text is announced, associated with the field, and not conveyed by color alone.
- Review the main pages at normal zoom and increased zoom for readable contrast and preserved focus visibility.

## Mobile / responsive notes

- Tightened small-screen spacing, reduced oversized headings on narrow viewports, and made cards more compact on phones while preserving desktop layout quality.
- Improved mobile header, nav, and action-group stacking so key controls wrap cleanly instead of cramping or overflowing.
- Increased touch target sizing for primary form controls and action buttons, and made dense page actions stack into full-width buttons on smaller screens.

Manual checks to run:

- Test the main routes around 320px, 360px, and 390px widths to confirm no normal page content causes horizontal scrolling.
- Check header, nav, and top-page actions on mobile widths for clean wrapping, readable labels, and comfortable tap targets.
- On Watchlist, Events, Trades, Event Detail, and Trade Detail, confirm cards remain readable and action groups stack cleanly.
- On Login, Signup, Watchlist, Event Create, Playbook, and Trade forms, verify fields, hints, and error messages stay readable and usable without zooming out.
