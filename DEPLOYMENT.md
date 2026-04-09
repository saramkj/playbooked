# Render Deployment

This repo can be deployed to Render as four resources:

1. A web service for `apps/api`
2. A static site for `apps/web`
3. A Render Postgres database
4. A Render Key Value instance for Redis-compatible session storage

If you want Render to create those resources from code, use the root [`render.yaml`](/mnt/d/Uni/Portfolio/playbooked/render.yaml). The blueprint is intentionally minimal and does not hardcode secrets.

## Services To Create

### API

- Type: `Web Service`
- Name: `playbooked-api`
- Runtime: `Node`
- Region: `Oregon` unless you have a closer production region
- Build command: `pnpm install --frozen-lockfile && pnpm build:api`
- Pre-deploy command: `pnpm db:deploy`
- Start command: `pnpm start:api`
- Health check path: `/health`

### Web

- Type: `Static Site`
- Name: `playbooked-web`
- Build command: `pnpm install --frozen-lockfile && pnpm build:web`
- Publish directory: `apps/web/dist`
- Rewrite rule: `/* -> /index.html`

### Postgres

- Type: `Postgres`
- Name: `playbooked-db`

### Redis

- Type: `Key Value`
- Name: `playbooked-redis`

## Required Env Vars

### API service

- `DATABASE_URL`: set from the Render Postgres connection string
- `REDIS_URL`: set from the Render Key Value connection string
- `SESSION_SECRET`: a long random secret
- `WEB_ORIGIN`: the public URL of the Render static site, for example `https://playbooked-web.onrender.com`

Render also provides these automatically for the API web service:

- `PORT`
- `NODE_ENV=production`

`API_PORT` is still supported locally, but Render should rely on `PORT`.

### Web static site

- `VITE_API_ORIGIN`: the public URL of the API web service, for example `https://playbooked-api.onrender.com`

## Deploy Order

1. Create or sync the `render.yaml` blueprint.
2. Let Render create the API, web, Postgres, and Key Value resources.
3. Set `WEB_ORIGIN` on `playbooked-api` to the final static site URL.
4. Set `VITE_API_ORIGIN` on `playbooked-web` to the final API URL.
5. Redeploy both services after those two URL values are set.

## Post-Deploy Checks

1. Open `https://<api-service>/health` and confirm it returns `{"ok":true}` with HTTP 200.
2. Open the static site and verify the app shell loads without a blank screen.
3. Sign up or log in through the deployed UI and confirm the browser receives a session cookie.
4. Perform one authenticated API-backed flow, such as loading the current session or a dashboard page, to confirm CORS, sessions, Redis, and Prisma-backed DB access are all working together.
5. Check the API deploy logs and confirm the service starts on Render without port-binding errors.
