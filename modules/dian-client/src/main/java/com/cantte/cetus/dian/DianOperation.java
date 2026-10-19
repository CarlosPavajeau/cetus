package com.cantte.cetus.dian;

/** Operations of IWcfDianCustomerServices used by Cetus. */
public enum DianOperation {
    SEND_BILL_SYNC("SendBillSync"),
    SEND_TEST_SET_ASYNC("SendTestSetAsync"),
    GET_STATUS("GetStatus"),
    GET_STATUS_ZIP("GetStatusZip"),
    GET_NUMBERING_RANGE("GetNumberingRange");

    public static final String SERVICE_NS = "http://wcf.dian.colombia";

    private final String operationName;

    DianOperation(String operationName) {
        this.operationName = operationName;
    }

    public String operationName() {
        return operationName;
    }

    public String action() {
        return SERVICE_NS + "/IWcfDianCustomerServices/" + operationName;
    }
}
