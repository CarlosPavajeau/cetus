package com.cantte.cetus.ubl.model;

import jakarta.xml.bind.annotation.XmlAnyElement;
import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlType;

import java.util.ArrayList;
import java.util.List;

/**
 * UBL extensions: the first one carries the DIAN extensions. The second one, for the signature, is
 * appended to the DOM by {@code UblMarshaller.signatureSlot}.
 */
public final class Ext {

    private Ext() {
    }

    @XmlType(name = "UBLExtensions", propOrder = {"extensions"})
    public static class UblExtensions {
        @XmlElement(name = "UBLExtension", namespace = Ns.EXT)
        public List<UblExtension> extensions = new ArrayList<>();
    }

    @XmlType(name = "UBLExtension", propOrder = {"content"})
    public static class UblExtension {
        @XmlElement(name = "ExtensionContent", namespace = Ns.EXT)
        public ExtensionContent content = new ExtensionContent();

        public static UblExtension of(Object payload) {
            UblExtension extension = new UblExtension();
            extension.content.payload = payload;
            return extension;
        }
    }

    @XmlType(name = "ExtensionContent")
    public static class ExtensionContent {
        @XmlAnyElement(lax = true)
        public Object payload;
    }
}
