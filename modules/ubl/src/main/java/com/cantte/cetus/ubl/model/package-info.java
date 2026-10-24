/**
 * Hand-written JAXB model of the subset of UBL 2.1 used by the DIAN.
 *
 * <p>Element names are the official UBL names (already in English). Every class declares its
 * {@code propOrder} because the XSD sequences are ordered and the DIAN validates them.
 */
@XmlSchema(
        elementFormDefault = XmlNsForm.QUALIFIED,
        xmlns = {
            @XmlNs(prefix = "", namespaceURI = Ns.INVOICE),
            @XmlNs(prefix = "cac", namespaceURI = Ns.CAC),
            @XmlNs(prefix = "cbc", namespaceURI = Ns.CBC),
            @XmlNs(prefix = "ext", namespaceURI = Ns.EXT),
            @XmlNs(prefix = "sts", namespaceURI = Ns.STS),
            @XmlNs(prefix = "ds", namespaceURI = Ns.DS),
            @XmlNs(prefix = "xades", namespaceURI = Ns.XADES)
        })
@XmlAccessorType(XmlAccessType.FIELD)
package com.cantte.cetus.ubl.model;

import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlNs;
import jakarta.xml.bind.annotation.XmlNsForm;
import jakarta.xml.bind.annotation.XmlSchema;
