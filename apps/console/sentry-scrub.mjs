// Shared by instrument.server.mjs and src/instrument.client.ts. These links carry a credential in their
// path (one-time tokens, invitations) or query (password resets), which would reach Sentry in URLs, span
// names and breadcrumbs.
const credentialPaths = /\/(certificate-uploads?|contact-verifications?|invitations)\/[^/?#"\s]+/g;
const credentialQuery = /([?&][^=&#"\s]*token[^=&#"\s]*=)[^&#"\s]*/gi;

/** The event or span, changed in place, with every such value replaced by [Filtered]. */
export function scrubLinks(event) {
    return scrub(event, new WeakSet());
}

function scrub(value, seen) {
    if (typeof value === "string") {
        return value
            .replace(credentialPaths, "/$1/[Filtered]")
            .replace(credentialQuery, "$1[Filtered]");
    }
    if (value === null || typeof value !== "object" || seen.has(value)) {
        return value;
    }
    seen.add(value);
    for (const key of Object.keys(value)) {
        // The SDK's own request and scope objects, never sent.
        if (key !== "sdkProcessingMetadata") {
            value[key] = scrub(value[key], seen);
        }
    }
    return value;
}
