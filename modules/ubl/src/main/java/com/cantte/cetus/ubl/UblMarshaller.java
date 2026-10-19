package com.cantte.cetus.ubl;

import com.cantte.cetus.ubl.model.DianExtensions;
import com.cantte.cetus.ubl.model.Ns;
import com.cantte.cetus.ubl.model.UblCreditNote;
import com.cantte.cetus.ubl.model.UblInvoice;
import jakarta.xml.bind.JAXBContext;
import jakarta.xml.bind.JAXBException;
import jakarta.xml.bind.Marshaller;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;

/** Marshals the UBL model into a DOM, ready to receive the XAdES signature. */
public final class UblMarshaller {

    private static final JAXBContext CONTEXT = createContext();

    public Document toDocument(UblInvoice invoice) {
        return marshal(invoice);
    }

    public Document toDocument(UblCreditNote creditNote) {
        Document document = marshal(creditNote);
        useDefaultNamespace(document);
        return document;
    }

    private Document marshal(Object root) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            Document document = factory.newDocumentBuilder().newDocument();
            Marshaller marshaller = CONTEXT.createMarshaller();
            marshaller.setProperty(Marshaller.JAXB_ENCODING, "UTF-8");
            marshaller.setProperty(Marshaller.JAXB_FORMATTED_OUTPUT, Boolean.FALSE);
            marshaller.marshal(root, document);
            return document;
        } catch (Exception e) {
            throw new IllegalStateException("Could not marshal UBL document: " + e.getMessage(), e);
        }
    }

    /**
     * The package binds the default namespace to Invoice-2, so JAXB gives any other root a generated
     * prefix (ns8:CreditNote). Every other element is prefixed, so the root can safely take the default
     * namespace, as in the DIAN examples. Done before signing, so the signature covers the final form.
     */
    private static void useDefaultNamespace(Document document) {
        Element root = document.getDocumentElement();
        String generatedPrefix = root.getPrefix();
        Element renamed = (Element) document.renameNode(root, root.getNamespaceURI(), root.getLocalName());
        if (generatedPrefix != null) {
            renamed.removeAttributeNS(XMLConstants.XMLNS_ATTRIBUTE_NS_URI, generatedPrefix);
        }
        renamed.setAttributeNS(XMLConstants.XMLNS_ATTRIBUTE_NS_URI, "xmlns", renamed.getNamespaceURI());
    }

    /**
     * The ExtensionContent of the second UBLExtension, where the signature goes. The schema forbids an
     * empty ExtensionContent, so the slot is not marshalled: it is appended here, right before signing.
     */
    public static Element signatureSlot(Document document) {
        NodeList contents = document.getElementsByTagNameNS(Ns.EXT, "ExtensionContent");
        if (contents.getLength() >= 2) {
            return (Element) contents.item(1);
        }
        NodeList extensions = document.getElementsByTagNameNS(Ns.EXT, "UBLExtensions");
        if (extensions.getLength() == 0) {
            throw new IllegalStateException("UBL document has no UBLExtensions");
        }
        Element extension = document.createElementNS(Ns.EXT, "ext:UBLExtension");
        Element content = document.createElementNS(Ns.EXT, "ext:ExtensionContent");
        extension.appendChild(content);
        extensions.item(0).appendChild(extension);
        return content;
    }

    private static JAXBContext createContext() {
        try {
            return JAXBContext.newInstance(UblInvoice.class, UblCreditNote.class, DianExtensions.class);
        } catch (JAXBException e) {
            throw new ExceptionInInitializerError(e);
        }
    }
}
