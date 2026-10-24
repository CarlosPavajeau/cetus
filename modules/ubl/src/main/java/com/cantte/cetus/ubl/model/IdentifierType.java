package com.cantte.cetus.ubl.model;

import jakarta.xml.bind.annotation.XmlAttribute;
import jakarta.xml.bind.annotation.XmlValue;

public class IdentifierType {

    @XmlValue
    public String value;

    @XmlAttribute
    public String schemeAgencyID;

    @XmlAttribute
    public String schemeAgencyName;

    @XmlAttribute
    public String schemeID;

    @XmlAttribute
    public String schemeName;

    public static IdentifierType of(String value) {
        IdentifierType id = new IdentifierType();
        id.value = value;
        return id;
    }

    public IdentifierType agency(String agencyId, String agencyName) {
        this.schemeAgencyID = agencyId;
        this.schemeAgencyName = agencyName;
        return this;
    }

    public IdentifierType scheme(String id, String name) {
        this.schemeID = id;
        this.schemeName = name;
        return this;
    }
}
