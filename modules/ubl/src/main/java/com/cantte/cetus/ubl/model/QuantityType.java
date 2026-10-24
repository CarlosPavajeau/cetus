package com.cantte.cetus.ubl.model;

import jakarta.xml.bind.annotation.XmlAttribute;
import jakarta.xml.bind.annotation.XmlValue;
import java.math.BigDecimal;

public class QuantityType {

    @XmlValue
    public BigDecimal value;

    @XmlAttribute
    public String unitCode;

    public static QuantityType of(BigDecimal value, String unitCode) {
        QuantityType quantity = new QuantityType();
        quantity.value = value;
        quantity.unitCode = unitCode;
        return quantity;
    }
}
