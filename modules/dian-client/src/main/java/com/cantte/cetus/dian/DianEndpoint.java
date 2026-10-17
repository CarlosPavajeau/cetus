package com.cantte.cetus.dian;

/** DIAN web service endpoints. Confirm URLs in the current web services guide. */
public enum DianEndpoint {
    TEST("https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc"),
    LIVE("https://vpfe.dian.gov.co/WcfDianCustomerServices.svc");

    private final String url;

    DianEndpoint(String url) {
        this.url = url;
    }

    public String url() {
        return url;
    }
}
