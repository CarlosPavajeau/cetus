package com.cantte.cetus.email;

/**
 * Lists of addresses kept by the email provider, to write to everyone on one later (a broadcast) with the
 * provider's own unsubscribe link.
 */
public interface ContactLists {

    /**
     * Adds the address to the list named {@code listName}, creating the contact and the list when missing. Adding
     * an address already on the list changes nothing.
     *
     * @throws EmailRateLimited        the provider asks to slow down; try again later
     * @throws EmailTransientException network error, timeout or provider failure; safe to retry
     * @throws EmailRejectedException  the provider refused the address or the list; retrying will not help
     */
    void subscribe(String email, String listName);
}
