import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

export function ambassadorKey(purpose: "password" | "session" | "participant-session"): Buffer {
  const secret = process.env.AMBASSADOR_CREDENTIAL_SECRET ?? process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Ambassador credentials require a secret of at least 32 characters.");
  return createHmac("sha256", secret).update(`netronix-ambassador-${purpose}-v1`).digest();
}

export async function issueAmbassadorPassword(id: string) {
  const password = randomBytes(6).toString("base64url");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ambassadorKey("password"), iv);
  cipher.setAAD(Buffer.from(id));
  const ciphertext = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return {
    password,
    passwordHash: await bcrypt.hash(password, 12),
    issuedPassword: Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url"),
  };
}

export function revealAmbassadorPassword(id: string, sealed: string): string {
  const bytes = Buffer.from(sealed, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", ambassadorKey("password"), bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(id));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8");
}
