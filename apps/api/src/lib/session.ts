import type { Request } from "express";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient, type RedisClientType } from "redis";
import { env } from "./env.js";

let redisClient: RedisClientType | null = null;

function createMemoryStore() {
  return new session.MemoryStore();
}

function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient({
    url: env.redisUrl,
  });

  redisClient.on("error", (error) => {
    console.error("Redis session client error", error);
  });

  return redisClient;
}

function getSessionStore() {
  if (env.isTest) {
    return createMemoryStore();
  }

  return new RedisStore({
    client: getRedisClient(),
    prefix: "playbooked:sess:",
  });
}

export async function ensureRedisConnected() {
  if (env.isTest) {
    return;
  }

  const client = getRedisClient();

  if (!client.isOpen) {
    await client.connect();
  }
}

export function createSessionMiddleware() {
  return session({
    name: env.sessionCookieName,
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: getSessionStore(),
    proxy: env.isProduction,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProduction,
      path: "/",
      maxAge: env.sessionTtlSeconds * 1000,
    },
  });
}

export function clearSessionCookie(_req: Request) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.isProduction,
    path: "/",
  };
}

export function regenerateSession(req: Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export function saveSession(req: Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export function destroySession(req: Request) {
  return new Promise<void>((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
