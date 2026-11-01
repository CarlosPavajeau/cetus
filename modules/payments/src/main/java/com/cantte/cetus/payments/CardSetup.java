package com.cantte.cetus.payments;

import java.net.URI;

/**
 * What the browser needs to save a card without the card reaching Cetus: the public key and the address that
 * tokenizes the card, and the provider's terms the customer accepts first. Each term's token proves that the
 * customer saw it, and goes back with the card's token.
 */
public record CardSetup(
        String publicKey, URI tokenizationUrl, AcceptanceDocument endUserPolicy, AcceptanceDocument personalDataAuth) {

    /** A document the customer accepts: its link, and the provider's token for the acceptance. */
    public record AcceptanceDocument(String token, URI permalink) {}
}
