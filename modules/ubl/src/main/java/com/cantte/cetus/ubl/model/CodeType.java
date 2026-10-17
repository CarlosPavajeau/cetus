package com.cantte.cetus.ubl.model;

import jakarta.xml.bind.annotation.XmlAttribute;
import jakarta.xml.bind.annotation.XmlValue;

public class CodeType {

    @XmlValue
    public String value;
    @XmlAttribute
    public String listAgencyID;
    @XmlAttribute
    public String listAgencyName;
    @XmlAttribute
    public String listSchemeURI;
    @XmlAttribute
    public String listName;

    public static CodeType of(String value) {
        CodeType code = new CodeType();
        code.value = value;
        return code;
    }
}
