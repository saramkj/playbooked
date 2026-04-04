# Security

This project includes a practical MVP security baseline focused on the API.

## Protections in place

- Cookie-based sessions use `httpOnly`, `sameSite=lax`, a non-default cookie name, and `secure` in production.
- Production startup now fails fast if required security-sensitive configuration such as `SESSION_SECRET` is missing or left on the dev default.
- Double-submit CSRF protection remains enabled for state-changing requests and is compatible with the current frontend flow.
- Helmet is enabled with a dev-friendly JSON API configuration.
- Auth routes are rate limited:
  - `POST /api/auth/login`: 5 requests per 10 minutes
  - `POST /api/auth/register`: 5 requests per 10 minutes
- Basic create-heavy write routes are also rate limited with JSON `429` responses.
- Protected endpoints continue to require auth, and user-owned resources continue to return `404` when the resource is missing or not owned by the requester.
- Write/update payloads use server-side validation and return `422` for invalid input without changing the existing `409` conflict behavior.
- Malformed JSON request bodies are rejected with `422` instead of falling through to a generic server error.

## Local verification checklist

- Confirm `GET /api/watchlist_items` without a session returns `401`.
- Confirm accessing another user's event, playbook, trade, or watchlist item returns `404`.
- Confirm invalid write payloads return `422` with field-level error details.
- Confirm the 6th failed login attempt within 10 minutes returns `429`.
- Confirm login, register, logout, session refresh, and CSRF-protected frontend requests still work normally on localhost.

## Notes

- This is a baseline hardening pass, not a full security audit.
- No real secrets should be committed; use `.env.example` as the safe template for local setup.
