using System;
using System.Security.Cryptography;
using System.Text;

public static class CetusWebhooks
{
    /// <summary>
    /// <c>webhookId</c>, <c>timestamp</c> y <c>signature</c> son los encabezados <c>webhook-id</c>,
    /// <c>webhook-timestamp</c> y <c>webhook-signature</c>. <c>rawBody</c> es el cuerpo tal como llegó,
    /// en bytes, antes de convertirlo a JSON.
    /// </summary>
    public static bool Verify(string webhookId, string timestamp, string signature, byte[] rawBody, string secret)
    {
        if (!long.TryParse(timestamp, out var sentAt)
            || Math.Abs(DateTimeOffset.UtcNow.ToUnixTimeSeconds() - sentAt) > 300)
        {
            return false;
        }
        var key = Convert.FromBase64String(secret.StartsWith("whsec_") ? secret["whsec_".Length..] : secret);
        byte[] content = [.. Encoding.UTF8.GetBytes($"{webhookId}.{timestamp}."), .. rawBody];
        var expected = HMACSHA256.HashData(key, content);
        foreach (var entry in signature.Split(' '))
        {
            var parts = entry.Split(',', 2);
            if (parts.Length != 2 || parts[0] != "v1")
            {
                continue;
            }
            var received = new byte[expected.Length];
            if (Convert.TryFromBase64String(parts[1], received, out var length)
                && length == expected.Length
                && CryptographicOperations.FixedTimeEquals(expected, received))
            {
                return true;
            }
        }
        return false;
    }
}
