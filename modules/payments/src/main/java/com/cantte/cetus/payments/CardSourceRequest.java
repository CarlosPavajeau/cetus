package com.cantte.cetus.payments;

/**
 * A card to charge later without the customer: the token the browser got from the provider, never the card, and
 * the tokens of the terms the customer accepted. {@code customerEmail} is who the provider knows the card's owner by.
 */
public record CardSourceRequest(
        String cardToken, String customerEmail, String acceptanceToken, String personalDataAuthToken) {

    public CardSourceRequest {
        if (cardToken == null || cardToken.isBlank()) {
            throw new IllegalArgumentException("A card source needs the card's token");
        }
        if (customerEmail == null || customerEmail.isBlank()) {
            throw new IllegalArgumentException("A card source needs the customer's email");
        }
        if (acceptanceToken == null || acceptanceToken.isBlank()) {
            throw new IllegalArgumentException("A card source needs the accepted terms");
        }
        if (personalDataAuthToken == null || personalDataAuthToken.isBlank()) {
            throw new IllegalArgumentException("A card source needs the accepted personal data authorization");
        }
    }
}
