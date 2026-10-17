package com.cantte.cetus.dianmock;

import java.util.List;

/** Response envelopes shaped like the ones WCF returns for IWcfDianCustomerServices. */
final class Soap {

    static final String SOAP_NS = "http://www.w3.org/2003/05/soap-envelope";
    static final String WSA_NS = "http://www.w3.org/2005/08/addressing";
    static final String SERVICE_NS = "http://wcf.dian.colombia";
    private static final String DIAN_RESPONSE_NS = "http://schemas.datacontract.org/2004/07/DianResponse";
    private static final String UPLOAD_NS = "http://schemas.datacontract.org/2004/07/UploadDocumentResponse";
    private static final String TRACK_ID_NS = "http://schemas.datacontract.org/2004/07/XmlParamsResponseTrackId";
    private static final String ARRAYS_NS = "http://schemas.microsoft.com/2003/10/Serialization/Arrays";

    /** What a DianResponse data contract carries. */
    record Result(boolean valid, String statusCode, String description, String message, List<String> errors,
                  String applicationResponse, String documentKey, String fileName) {
    }

    private Soap() {
    }

    static String single(String operation, Result result) {
        String body = "<" + operation + "Response xmlns=\"" + SERVICE_NS + "\"><" + operation + "Result xmlns:b=\""
                + DIAN_RESPONSE_NS + "\" xmlns:c=\"" + ARRAYS_NS + "\">" + fields(result) + "</" + operation
                + "Result></" + operation + "Response>";
        return envelope(responseAction(operation), body);
    }

    static String list(String operation, List<Result> results) {
        StringBuilder items = new StringBuilder();
        for (Result result : results) {
            items.append("<b:DianResponse>").append(fields(result)).append("</b:DianResponse>");
        }
        String body = "<" + operation + "Response xmlns=\"" + SERVICE_NS + "\"><" + operation + "Result xmlns:b=\""
                + DIAN_RESPONSE_NS + "\" xmlns:c=\"" + ARRAYS_NS + "\">" + items + "</" + operation
                + "Result></" + operation + "Response>";
        return envelope(responseAction(operation), body);
    }

    static String upload(String operation, String zipKey, List<String> errors) {
        StringBuilder messages = new StringBuilder();
        for (String error : errors) {
            messages.append("<c:XmlParamsResponseTrackId><c:ProcessedMessage>").append(escape(error))
                    .append("</c:ProcessedMessage></c:XmlParamsResponseTrackId>");
        }
        String body = "<" + operation + "Response xmlns=\"" + SERVICE_NS + "\"><" + operation + "Result xmlns:b=\""
                + UPLOAD_NS + "\" xmlns:c=\"" + TRACK_ID_NS + "\"><b:ErrorMessageList>" + messages
                + "</b:ErrorMessageList>" + optional("b:ZipKey", zipKey) + "</" + operation + "Result></"
                + operation + "Response>";
        return envelope(responseAction(operation), body);
    }

    static String fault(String code, String subcode, String reason) {
        String subcodeXml = subcode == null ? "" : "<s:Subcode><s:Value>" + escape(subcode) + "</s:Value></s:Subcode>";
        String body = "<s:Fault><s:Code><s:Value>" + escape(code) + "</s:Value>" + subcodeXml + "</s:Code>"
                + "<s:Reason><s:Text xml:lang=\"en-US\">" + escape(reason) + "</s:Text></s:Reason></s:Fault>";
        return envelope(WSA_NS + "/soap/fault", body);
    }

    static String applicationResponse(String documentKey, boolean accepted, List<String> errors) {
        StringBuilder notes = new StringBuilder();
        for (String error : errors) {
            notes.append("<cbc:Description>").append(escape(error)).append("</cbc:Description>");
        }
        return "<ApplicationResponse xmlns=\"urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2\""
                + " xmlns:cbc=\"urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2\">"
                + "<cbc:Note>Generado por dian-mock, sin validez fiscal</cbc:Note>"
                + "<cbc:UUID>" + escape(documentKey) + "</cbc:UUID>"
                + "<cbc:ResponseCode>" + (accepted ? "02" : "04") + "</cbc:ResponseCode>" + notes
                + "</ApplicationResponse>";
    }

    private static String fields(Result result) {
        StringBuilder errors = new StringBuilder();
        for (String error : result.errors()) {
            errors.append("<c:string>").append(escape(error)).append("</c:string>");
        }
        return "<b:ErrorMessage>" + errors + "</b:ErrorMessage>"
                + "<b:IsValid>" + result.valid() + "</b:IsValid>"
                + optional("b:StatusCode", result.statusCode())
                + optional("b:StatusDescription", result.description())
                + optional("b:StatusMessage", result.message())
                + optional("b:XmlBase64Bytes", result.applicationResponse())
                + optional("b:XmlDocumentKey", result.documentKey())
                + optional("b:XmlFileName", result.fileName());
    }

    private static String envelope(String action, String body) {
        return "<s:Envelope xmlns:s=\"" + SOAP_NS + "\" xmlns:a=\"" + WSA_NS + "\"><s:Header>"
                + "<a:Action s:mustUnderstand=\"1\">" + action + "</a:Action></s:Header><s:Body>" + body
                + "</s:Body></s:Envelope>";
    }

    private static String responseAction(String operation) {
        return SERVICE_NS + "/IWcfDianCustomerServices/" + operation + "Response";
    }

    private static String optional(String element, String value) {
        return value == null ? "<" + element + "/>" : "<" + element + ">" + escape(value) + "</" + element + ">";
    }

    static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
