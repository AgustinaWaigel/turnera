import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";

/** Token del link de gestión del turno: 256 bits, URL-safe. */
export function createManageToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: sha256(token) };
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function hmac(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function isWellFormedToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
