package com.cantte.cetus.jobs;

public final class JobTypes {

    /** Build, sign and send a document to the DIAN. reference_id = document id. */
    public static final String PROCESS_DOCUMENT = "PROCESS_DOCUMENT";
    /** Poll GetStatusZip for an asynchronous test set upload. reference_id = document id. */
    public static final String CHECK_TEST_SET_STATUS = "CHECK_TEST_SET_STATUS";

    private JobTypes() {
    }
}
