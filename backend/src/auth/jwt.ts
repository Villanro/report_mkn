import jwt from "jsonwebtoken";

export interface AuthTokenPayload {
  username: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no está configurado en el entorno (.env)");
  }
  return secret;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "8h" });
}

export function verifyAuthToken(token: string): AuthTokenPayload | undefined {
  try {
    return jwt.verify(token, getSecret()) as AuthTokenPayload;
  } catch {
    return undefined;
  }
}
