<?php

/**
 * $webhookId, $timestamp y $signature son los encabezados webhook-id, webhook-timestamp y
 * webhook-signature. $rawBody es el cuerpo tal como llegó (file_get_contents('php://input')).
 */
function verifyCetusWebhook(string $webhookId, string $timestamp, string $signature, string $rawBody, string $secret): bool
{
    if (!ctype_digit($timestamp) || abs(time() - (int) $timestamp) > 300) {
        return false;
    }
    $key = base64_decode(preg_replace('/^whsec_/', '', $secret), true);
    if ($key === false) {
        return false;
    }
    $expected = base64_encode(hash_hmac('sha256', "{$webhookId}.{$timestamp}.{$rawBody}", $key, true));
    foreach (explode(' ', $signature) as $entry) {
        [$version, $value] = array_pad(explode(',', $entry, 2), 2, '');
        if ($version === 'v1' && hash_equals($expected, $value)) {
            return true;
        }
    }
    return false;
}
