type NodeEnv = "development" | "test" | "production";

function readNumber(name: string, fallback: number) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const nodeEnv = (process.env.NODE_ENV as NodeEnv | undefined) ?? "development";

export const env = {
  nodeEnv,
  isTest: nodeEnv === "test",
  apiPort: readNumber("API_PORT", 3000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/playbooked?schema=public",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  sessionSecret: process.env.SESSION_SECRET ?? "dev_only_change_me_to_a_long_random_string",
  sessionTtlSeconds: readNumber("SESSION_TTL_SECONDS", 1209600),
  sessionCookieName: "playbooked.sid",
  csrfCookieName: process.env.CSRF_COOKIE_NAME ?? "csrf_token",
  csrfHeaderName: process.env.CSRF_HEADER_NAME ?? "X-CSRF-Token",
} as const;
