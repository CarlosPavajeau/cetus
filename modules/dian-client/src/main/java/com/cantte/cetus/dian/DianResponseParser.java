package com.cantte.cetus.dian;

import com.cantte.cetus.signing.XmlSupport;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

/**
 * Reads DIAN responses by local name. The response namespaces come from WCF data contracts
 * and are irrelevant for us, so matching by local name keeps the parser simple and robust.
 */
final class DianResponseParser {

    private DianResponseParser() {}

    static DianResponse single(String rawXml, String resultElement) {
        Element result = requireResult(rawXml, resultElement);
        return toResponse(result, rawXml);
    }

    /** GetStatusZip returns a list of DianResponse; for a single document the first one is used. */
    static List<DianResponse> list(String rawXml) {
        Element result = requireResult(rawXml, "GetStatusZipResult");
        List<DianResponse> responses = new ArrayList<>();
        for (Element child : children(result, "DianResponse")) {
            responses.add(toResponse(child, rawXml));
        }
        return responses;
    }

    static UploadResponse upload(String rawXml) {
        Element result = requireResult(rawXml, "SendTestSetAsyncResult");
        List<String> errors = new ArrayList<>();
        NodeList messages = result.getElementsByTagNameNS("*", "ProcessedMessage");
        for (int i = 0; i < messages.getLength(); i++) {
            String text = messages.item(i).getTextContent();
            if (text != null && !text.isBlank()) {
                errors.add(text.trim());
            }
        }
        return new UploadResponse(text(result, "ZipKey"), errors, rawXml);
    }

    /** GetNumberingRange: OperationCode 100 and one NumberRangeResponse per authorized range. */
    static NumberingRangeResponse numberingRanges(String rawXml) {
        Element result = requireResult(rawXml, "GetNumberingRangeResult");
        List<NumberingRangeResponse.Range> ranges = new ArrayList<>();
        NodeList items = result.getElementsByTagNameNS("*", "NumberRangeResponse");
        for (int i = 0; i < items.getLength(); i++) {
            Element item = (Element) items.item(i);
            ranges.add(new NumberingRangeResponse.Range(
                    text(item, "ResolutionNumber"),
                    text(item, "ResolutionDate"),
                    text(item, "Prefix"),
                    number(text(item, "FromNumber")),
                    number(text(item, "ToNumber")),
                    text(item, "ValidDateFrom"),
                    text(item, "ValidDateTo"),
                    text(item, "TechnicalKey")));
        }
        return new NumberingRangeResponse(
                text(result, "OperationCode"), text(result, "OperationDescription"), List.copyOf(ranges), rawXml);
    }

    private static Long number(String value) {
        try {
            return value == null ? null : Long.parseLong(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Element requireResult(String rawXml, String resultElement) {
        Document doc = XmlSupport.parse(rawXml.getBytes(StandardCharsets.UTF_8));
        NodeList faults = doc.getElementsByTagNameNS(SoapEnvelopeBuilder.SOAP_NS, "Fault");
        if (faults.getLength() > 0) {
            throw fault((Element) faults.item(0), rawXml);
        }
        NodeList results = doc.getElementsByTagNameNS("*", resultElement);
        if (results.getLength() == 0) {
            throw new DianFaultException("Unexpected DIAN response: " + resultElement + " not found", rawXml);
        }
        return (Element) results.item(0);
    }

    /** SOAP 1.2: Fault/Code/Value, nested Code/Subcode/Value..., Fault/Reason/Text. */
    private static DianFaultException fault(Element fault, String rawXml) {
        String code = null;
        List<String> subcodes = new ArrayList<>();
        List<Element> codes = children(fault, "Code");
        Element current = codes.isEmpty() ? null : codes.getFirst();
        while (current != null) {
            String value = text(current, "Value");
            if (code == null) {
                code = value;
            } else if (value != null) {
                subcodes.add(value);
            }
            List<Element> nested = children(current, "Subcode");
            current = nested.isEmpty() ? null : nested.getFirst();
        }
        NodeList reasons = fault.getElementsByTagNameNS("*", "Text");
        String reason =
                reasons.getLength() > 0 ? reasons.item(0).getTextContent().trim() : "Unknown SOAP fault";
        return new DianFaultException(code == null ? "unknown" : code, subcodes, reason, rawXml);
    }

    private static DianResponse toResponse(Element element, String rawXml) {
        List<String> errors = new ArrayList<>();
        for (Element errorList : children(element, "ErrorMessage")) {
            NodeList items = errorList.getChildNodes();
            for (int i = 0; i < items.getLength(); i++) {
                Node item = items.item(i);
                if (item.getNodeType() == Node.ELEMENT_NODE
                        && !item.getTextContent().isBlank()) {
                    errors.add(item.getTextContent().trim());
                }
            }
        }
        return new DianResponse(
                "true".equalsIgnoreCase(text(element, "IsValid")),
                text(element, "StatusCode"),
                text(element, "StatusDescription"),
                text(element, "StatusMessage"),
                List.copyOf(errors),
                text(element, "XmlBase64Bytes"),
                text(element, "XmlDocumentKey"),
                rawXml);
    }

    private static List<Element> children(Element parent, String localName) {
        List<Element> elements = new ArrayList<>();
        NodeList nodes = parent.getChildNodes();
        for (int i = 0; i < nodes.getLength(); i++) {
            Node node = nodes.item(i);
            if (node.getNodeType() == Node.ELEMENT_NODE && localName.equals(node.getLocalName())) {
                elements.add((Element) node);
            }
        }
        return elements;
    }

    private static String text(Element parent, String localName) {
        List<Element> matches = children(parent, localName);
        if (matches.isEmpty()) {
            return null;
        }
        String value = matches.getFirst().getTextContent();
        return value == null || value.isBlank() ? null : value.trim();
    }
}
