package com.cantte.cetus.dianmock;

import java.util.Locale;

/** How the mock answers the send operations. Status queries always reflect what was stored. */
enum Scenario {
    /** Validates the zip and accepts it unless it is structurally broken or a duplicate. */
    ACCEPT,
    /** Same checks, but always rejects with StatusCode 99. */
    REJECT,
    /** The generic {@code s:Client} fault the DIAN returns when it rejects the request itself. */
    CLIENT_FAULT,
    /** A WCF internal error ({@code s:Receiver}), which the worker should retry. */
    SERVER_FAULT,
    /** Registers the document but answers after the worker's request timeout. */
    TIMEOUT;

    static Scenario parse(String value) {
        return valueOf(value.trim().toUpperCase(Locale.ROOT).replace('-', '_'));
    }

    String label() {
        return name().toLowerCase(Locale.ROOT).replace('_', '-');
    }
}
