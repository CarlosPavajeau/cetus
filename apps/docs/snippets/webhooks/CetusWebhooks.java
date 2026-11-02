import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class CetusWebhooks {

    private CetusWebhooks() {}

    /**
     * {@code webhookId}, {@code timestamp} y {@code signature} son los encabezados {@code webhook-id},
     * {@code webhook-timestamp} y {@code webhook-signature}. {@code rawBody} es el cuerpo tal como llegó,
     * en bytes, antes de convertirlo a JSON.
     */
    public static boolean verify(
            String webhookId, String timestamp, String signature, byte[] rawBody, String secret) {
        long sentAt;
        try {
            sentAt = Long.parseLong(timestamp);
        } catch (NumberFormatException e) {
            return false;
        }
        if (Math.abs(Instant.now().getEpochSecond() - sentAt) > 300) {
            return false;
        }
        byte[] expected;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            byte[] key = Base64.getDecoder().decode(secret.replaceFirst("^whsec_", ""));
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            mac.update((webhookId + "." + timestamp + ".").getBytes(StandardCharsets.UTF_8));
            expected = mac.doFinal(rawBody);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
        for (String entry : signature.split(" ")) {
            String[] parts = entry.split(",", 2);
            if (parts.length != 2 || !parts[0].equals("v1")) {
                continue;
            }
            byte[] received;
            try {
                received = Base64.getDecoder().decode(parts[1]);
            } catch (IllegalArgumentException e) {
                continue;
            }
            if (MessageDigest.isEqual(expected, received)) {
                return true;
            }
        }
        return false;
    }
}
