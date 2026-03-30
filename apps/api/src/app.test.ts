import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./app.js";

describe("health", () => {
  it("GET /health returns 200 and { ok: true }", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
