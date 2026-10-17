package com.cantte.cetus.dian;

import com.cantte.cetus.signing.XmlSupport;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/** Builds the SOAP 1.2 envelope with WS-Addressing headers, ready to be signed. */
final class SoapEnvelopeBuilder {

    static final String SOAP_NS = "http://www.w3.org/2003/05/soap-envelope";
    static final String WSA_NS = "http://www.w3.org/2005/08/addressing";
    static final String XMLNS_NS = "http://www.w3.org/2000/xmlns/";

    private SoapEnvelopeBuilder() {
    }

    static Envelope build(String endpointUrl, DianOperation operation, Map<String, String> parameters) {
        Document doc = XmlSupport.newDocument();
        Element envelope = doc.createElementNS(SOAP_NS, "soap:Envelope");
        envelope.setAttributeNS(XMLNS_NS, "xmlns:soap", SOAP_NS);
        envelope.setAttributeNS(XMLNS_NS, "xmlns:wcf", DianOperation.SERVICE_NS);
        doc.appendChild(envelope);

        Element header = doc.createElementNS(SOAP_NS, "soap:Header");
        header.setAttributeNS(XMLNS_NS, "xmlns:wsa", WSA_NS);
        envelope.appendChild(header);

        Element action = doc.createElementNS(WSA_NS, "wsa:Action");
        action.setTextContent(operation.action());
        header.appendChild(action);

        Element to = doc.createElementNS(WSA_NS, "wsa:To");
        to.setAttributeNS(XMLNS_NS, "xmlns:wsu", WsSecuritySigner.WSU_NS);
        to.setAttributeNS(WsSecuritySigner.WSU_NS, "wsu:Id", "id-" + UUID.randomUUID().toString().replace("-", ""));
        to.setTextContent(endpointUrl);
        header.appendChild(to);

        Element body = doc.createElementNS(SOAP_NS, "soap:Body");
        envelope.appendChild(body);
        Element call = doc.createElementNS(DianOperation.SERVICE_NS, "wcf:" + operation.operationName());
        body.appendChild(call);
        for (Map.Entry<String, String> parameter : new LinkedHashMap<>(parameters).entrySet()) {
            Element element = doc.createElementNS(DianOperation.SERVICE_NS, "wcf:" + parameter.getKey());
            element.setTextContent(parameter.getValue());
            call.appendChild(element);
        }
        return new Envelope(doc, header, to);
    }

    record Envelope(Document document, Element header, Element to) {
    }
}
