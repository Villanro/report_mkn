import { afterEach, describe, expect, it } from "vitest";
import { OrdsUnavailableError } from "../errors.js";
import { getAuthHeaders } from "./client.js";

const ENV_KEYS = ["ORDS_AUTH", "ORDS_USER", "ORDS_PASSWORD"] as const;
const originalEnv: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) originalEnv[key] = process.env[key];

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe("getAuthHeaders", () => {
  it("no agrega ningún header sin ORDS_AUTH", () => {
    delete process.env.ORDS_AUTH;
    expect(getAuthHeaders()).toEqual({});
  });

  it("no agrega ningún header si ORDS_AUTH tiene un valor distinto de 'basic'", () => {
    process.env.ORDS_AUTH = "bearer";
    expect(getAuthHeaders()).toEqual({});
  });

  it("agrega Authorization: Basic <base64(user:password)> con ORDS_AUTH=basic", () => {
    process.env.ORDS_AUTH = "basic";
    process.env.ORDS_USER = "popeyes_user";
    process.env.ORDS_PASSWORD = "s3cr3t";

    const expectedToken = Buffer.from("popeyes_user:s3cr3t", "utf-8").toString("base64");
    expect(getAuthHeaders()).toEqual({ Authorization: `Basic ${expectedToken}` });
  });

  it("lanza OrdsUnavailableError si falta ORDS_USER u ORDS_PASSWORD con ORDS_AUTH=basic", () => {
    process.env.ORDS_AUTH = "basic";
    process.env.ORDS_USER = "popeyes_user";
    delete process.env.ORDS_PASSWORD;

    expect(() => getAuthHeaders()).toThrow(OrdsUnavailableError);
  });
});
