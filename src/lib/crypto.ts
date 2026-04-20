import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGO = "aes-256-gcm";

function key(): Buffer {
  const k = process.env.ENCRYPTION_KEY;
  if (!k) throw new Error("ENCRYPTION_KEY is not set");
  const buf = Buffer.from(k, "base64");
  if (buf.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 base64-decoded bytes");
  }
  return buf;
}

export type Encrypted = {
  ciphertext: Buffer;
  iv: string; // base64 nonce (12 bytes)
  tag: string; // base64 auth tag (16 bytes)
};

export function encryptJSON(obj: unknown): Encrypted {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const plaintext = Buffer.from(JSON.stringify(obj), "utf-8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptJSON<T = unknown>(c: Encrypted): T {
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(c.iv, "base64"));
  decipher.setAuthTag(Buffer.from(c.tag, "base64"));
  const decrypted = Buffer.concat([decipher.update(c.ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString("utf-8")) as T;
}
