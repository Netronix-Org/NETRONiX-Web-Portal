import { PAYMENT_BUCKET, PAYMENT_IMAGE_TYPES, PAYMENT_MAX_BYTES } from "./participants";

export function paymentStorageFetch(path: string, options: RequestInit = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Payment storage is not configured.");
  const headers = new Headers(options.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  return fetch(`${url.replace(/\/$/, "")}/storage/v1/${path}`, {
    ...options,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
}

export async function removePaymentProof(path: string) {
  try {
    const response = await paymentStorageFetch(`object/${PAYMENT_BUCKET}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [path] }),
    });
    if (!response.ok) console.error("[payment-storage] Could not remove an unused proof", response.status);
  } catch {
    console.error("[payment-storage] Could not remove an unused proof");
  }
}

export async function readPaymentImage(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  if (!PAYMENT_IMAGE_TYPES.includes(type) || !req.body) return null;
  if (Number(req.headers.get("content-length")) > PAYMENT_MAX_BYTES) return null;

  const reader = req.body.getReader();
  const buffer = new Uint8Array(PAYMENT_MAX_BYTES);
  let offset = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (offset + value.length > PAYMENT_MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      buffer.set(value, offset);
      offset += value.length;
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = buffer.subarray(0, offset);
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF"
    && Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP";
  if (type === "image/png" && png) return { bytes, type, extension: "png" };
  if (type === "image/jpeg" && jpeg) return { bytes, type, extension: "jpg" };
  if (type === "image/webp" && webp) return { bytes, type, extension: "webp" };
  return null;
}
