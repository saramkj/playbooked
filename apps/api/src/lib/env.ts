type NodeEnv = "development" | "test" | "production";
const defaultSessionSecret = "dev_only_change_me_to_a_long_random_string";

function readNumber(name: string, fallback: number) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readRequiredProductionString(name: string, fallback?: string) {
  const value = process.env[name]?.trim();

  if (value) {
    return value;
  }

  if (nodeEnv === "production") {
    throw new Error(`${name} must be set in production.`);
  }

  return fallback ?? "";
}

const nodeEnv = (process.env.NODE_ENV as NodeEnv | undefined) ?? "development";

const sessionSecret = process.env.SESSION_SECRET?.trim() || defaultSessionSecret;

if (nodeEnv === "production" && sessionSecret === defaultSessionSecret) {
  throw new Error("SESSION_SECRET must be set to a non-default value in production.");
}

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  isTest: nodeEnv === "test",
  apiPort: readNumber("API_PORT", 3000),
  webOrigin: readRequiredProductionString("WEB_ORIGIN", "http://localhost:5173"),
  databaseUrl: readRequiredProductionString(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/playbooked?schema=public",
  ),
  redisUrl: readRequiredProductionString("REDIS_URL", "redis://localhost:6379"),
  sessionSecret,
  sessionTtlSeconds: readNumber("SESSION_TTL_SECONDS", 1209600),
  sessionCookieName: process.env.SESSION_COOKIE_NAME?.trim() || "playbooked.sid",
  csrfCookieName: process.env.CSRF_COOKIE_NAME ?? "csrf_token",
  csrfHeaderName: process.env.CSRF_HEADER_NAME ?? "X-CSRF-Token",
  trustProxy: nodeEnv === "production" ? 1 : false,
} as const;
