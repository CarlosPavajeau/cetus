package com.cantte.cetus.ubl.model;

import jakarta.xml.bind.annotation.XmlAttribute;
import jakarta.xml.bind.annotation.XmlValue;

public class TextType {

    @XmlValue
    public String value;

    @XmlAttribute
    public String languageID;

    public static TextType of(String value, String languageId) {
        TextType text = new TextType();
        text.value = value;
        text.languageID = languageId;
        return text;
    }
}
