import { config } from "dotenv";
import { paymentStorageFetch } from "../src/lib/payment-storage";
import { PAYMENT_BUCKET, PAYMENT_IMAGE_TYPES, PAYMENT_MAX_BYTES } from "../src/lib/participants";

config({ path: ".env.local", quiet: true });

async function main() {
  const path = `bucket/${PAYMENT_BUCKET}`;
  const bucket = await paymentStorageFetch(path);
  if (!bucket.ok && bucket.status !== 404 && bucket.status !== 400) {
    throw new Error(`Couldn't check Storage bucket (HTTP ${bucket.status}).`);
  }
  const result = await paymentStorageFetch(bucket.ok ? path : "bucket", {
    method: bucket.ok ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(bucket.ok ? {} : { id: PAYMENT_BUCKET, name: PAYMENT_BUCKET }),
      public: false,
      file_size_limit: PAYMENT_MAX_BYTES,
      allowed_mime_types: PAYMENT_IMAGE_TYPES,
    }),
  });
  if (!result.ok) throw new Error(`Couldn't configure Storage bucket (HTTP ${result.status}).`);

  const verified = await paymentStorageFetch(path);
  if (!verified.ok) throw new Error(`Couldn't verify Storage bucket (HTTP ${verified.status}).`);
  const settings = await verified.json();
  if (settings.public !== false || Number(settings.file_size_limit) !== PAYMENT_MAX_BYTES
      || !PAYMENT_IMAGE_TYPES.every((type) => settings.allowed_mime_types?.includes(type))) {
    throw new Error("Storage bucket did not return the expected private settings.");
  }
  console.log("Private payment screenshot bucket verified with a 3 MB file limit.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Storage setup failed.");
  process.exitCode = 1;
});
