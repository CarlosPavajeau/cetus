import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * `webhookId`, `timestamp` y `signature` son los encabezados `webhook-id`, `webhook-timestamp` y
 * `webhook-signature`. `rawBody` es el cuerpo tal como llegó, antes de convertirlo a JSON.
 */
export function verifyCetusWebhook(webhookId, timestamp, signature, rawBody, secret) {
  const sentAt = Number(timestamp);
  if (!Number.isInteger(sentAt) || Math.abs(Date.now() / 1000 - sentAt) > 300) {
    return false;
  }
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${webhookId}.${timestamp}.${rawBody}`)
    .digest();
  return signature.split(" ").some((entry) => {
    const [version, value] = entry.split(",");
    const received = Buffer.from(value ?? "", "base64");
    return (
      version === "v1" && received.length === expected.length && timingSafeEqual(received, expected)
    );
  });
}
