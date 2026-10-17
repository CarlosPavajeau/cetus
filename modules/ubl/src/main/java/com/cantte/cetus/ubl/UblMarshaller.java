package com.cantte.cetus.ubl;

import com.cantte.cetus.ubl.model.DianExtensions;
import com.cantte.cetus.ubl.model.Ns;
import com.cantte.cetus.ubl.model.UblInvoice;
import jakarta.xml.bind.JAXBContext;
import jakarta.xml.bind.JAXBException;
import jakarta.xml.bind.Marshaller;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilderFactory;

/** Marshals the UBL model into a DOM, ready to receive the XAdES signature. */
public final class UblMarshaller {

    private static final JAXBContext CONTEXT = createContext();

    public Document toDocument(UblInvoice invoice) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            Document document = factory.newDocumentBuilder().newDocument();
            Marshaller marshaller = CONTEXT.createMarshaller();
            marshaller.setProperty(Marshaller.JAXB_ENCODING, "UTF-8");
            marshaller.setProperty(Marshaller.JAXB_FORMATTED_OUTPUT, Boolean.FALSE);
            marshaller.marshal(invoice, document);
            return document;
        } catch (Exception e) {
            throw new IllegalStateException("Could not marshal UBL invoice: " + e.getMessage(), e);
        }
    }

    /** The empty ExtensionContent of the second UBLExtension, where the signature goes. */
    public static Element signatureSlot(Document document) {
        NodeList contents = document.getElementsByTagNameNS(Ns.EXT, "ExtensionContent");
        if (contents.getLength() < 2) {
            throw new IllegalStateException("UBL document has no signature extension");
        }
        return (Element) contents.item(1);
    }

    private static JAXBContext createContext() {
        try {
            return JAXBContext.newInstance(UblInvoice.class, DianExtensions.class);
        } catch (JAXBException e) {
            throw new ExceptionInInitializerError(e);
        }
    }
}
