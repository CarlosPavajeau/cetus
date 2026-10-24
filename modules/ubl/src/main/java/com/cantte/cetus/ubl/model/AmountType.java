package com.cantte.cetus.ubl.model;

import jakarta.xml.bind.annotation.XmlAttribute;
import jakarta.xml.bind.annotation.XmlValue;
import java.math.BigDecimal;

public class AmountType {

    @XmlValue
    public BigDecimal value;

    @XmlAttribute
    public String currencyID;

    public static AmountType of(BigDecimal value, String currency) {
        AmountType amount = new AmountType();
        amount.value = value;
        amount.currencyID = currency;
        return amount;
    }
}
