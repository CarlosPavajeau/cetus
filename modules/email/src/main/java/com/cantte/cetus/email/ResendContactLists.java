package com.cantte.cetus.email;

import com.resend.Resend;
import com.resend.services.contacts.model.AddContactToSegmentOptions;
import com.resend.services.contacts.model.CreateContactOptions;
import com.resend.services.segments.model.BaseSegment;
import com.resend.services.segments.model.CreateSegmentOptions;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * {@link ContactLists} on Resend's segments (formerly audiences). A list is found by its name, or created, and its
 * id kept for the life of the instance; contacts are global in Resend, so an address is created once and then
 * added to each segment.
 */
public final class ResendContactLists implements ContactLists {

    private final Resend resend;
    private final Map<String, String> segmentIds = new ConcurrentHashMap<>();

    public ResendContactLists(String apiKey, String baseUrl, Duration connectTimeout, Duration readTimeout) {
        this.resend = Resend.builder()
                .apiKey(apiKey)
                .baseUrl(baseUrl)
                .connectTimeout(connectTimeout)
                .readTimeout(readTimeout)
                .build();
    }

    @Override
    public void subscribe(String email, String listName) {
        String segmentId = segmentIds.computeIfAbsent(listName, this::findOrCreateSegment);
        ensureContact(email);
        ResendErrors.call(() -> resend.contacts()
                .segments()
                .add(AddContactToSegmentOptions.builder()
                        .email(email)
                        .segmentId(segmentId)
                        .build()));
    }

    private String findOrCreateSegment(String name) {
        return ResendErrors.call(() -> resend.segments().list()).getData().stream()
                .filter(segment -> name.equals(segment.getName()))
                .map(BaseSegment::getId)
                .findFirst()
                .orElseGet(() -> ResendErrors.call(() -> resend.segments()
                                .create(CreateSegmentOptions.builder()
                                        .name(name)
                                        .build()))
                        .getId());
    }

    private void ensureContact(String email) {
        try {
            ResendErrors.call(() -> resend.contacts().get(email));
        } catch (EmailRejectedException e) {
            if (!ResendErrors.isNotFound(e)) {
                throw e;
            }
            ResendErrors.call(() -> resend.contacts()
                    .create(CreateContactOptions.builder().email(email).build()));
        }
    }
}
