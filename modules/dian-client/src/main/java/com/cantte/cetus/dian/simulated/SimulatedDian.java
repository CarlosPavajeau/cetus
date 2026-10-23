package com.cantte.cetus.dian.simulated;

import com.cantte.cetus.dian.DianFaultException;
import com.cantte.cetus.dian.DianResponse;
import com.cantte.cetus.dian.DianTransportException;
import com.cantte.cetus.signing.KeyMaterial;
import com.cantte.cetus.signing.XadesSigner;
import com.cantte.cetus.signing.XmlSupport;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Answers SendBillSync and GetStatus like the DIAN, without calling it: the same SOAP envelope, status
 * codes, rule messages and an ApplicationResponse with the DIAN's structure, signed with Cetus' sandbox
 * certificate. The outcome depends only on the document ({@link SimulatedScenario}) and on how many times
 * it was sent before, so the caller keeps no state here.
 */
public final class SimulatedDian {

    static final String SIMULATED_NOTE = "Documento simulado por Cetus, sin validez fiscal";

    private static final String SOAP_NS = "http://www.w3.org/2003/05/soap-envelope";
    private static final String WSA_NS = "http://www.w3.org/2005/08/addressing";
    private static final String ARRAYS_NS = "http://schemas.microsoft.com/2003/10/Serialization/Arrays";
    private static final String DIAN_NIT = "800197268";
    private static final String DIAN_NAME = "Unidad Especial Dirección de Impuestos y Aduanas Nacionales";
    private static final ZoneId COLOMBIA = ZoneId.of("America/Bogota");
    private static final Pattern RULE = Pattern.compile("^Regla:\\s*([^,]+?)\\s*,\\s*[^:]+:\\s*(.*)$");

    private static final String FAJ43B =
            "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suminstrado.";
    private static final List<String> REJECTION = List.of(
            "Regla: FAK26, Rechazo: Responsabilidad informada para receptor no valida según lista.",
            "Regla: FAB10a, Rechazo: El prefijo de numeración no es igual al código de la sucursal correspondiente a este punto de facturación",
            FAJ43B);
    private static final List<String> CREDIT_NOTE_REJECTION = List.of(
            "Regla: CBF04, Rechazo: La descripción de la corrección no corresponde al concepto de corrección informado.");

    private final KeyMaterial keys;
    private final XadesSigner signer;
    private final Clock clock;

    public SimulatedDian(KeyMaterial keys, Clock clock) {
        this.keys = keys;
        this.signer = new XadesSigner(clock);
        this.clock = clock;
    }

    /**
     * @param previousSends SendBillSync calls already made for this document
     * @throws DianTransportException the first send of {@link SimulatedScenario#TIMEOUT}
     * @throws DianFaultException     the first two sends of {@link SimulatedScenario#TEMPORARY_FAILURE}
     */
    public DianResponse sendBillSync(SimulatedDocument document, int previousSends) {
        SimulatedScenario scenario = SimulatedScenario.of(document);
        if (scenario == SimulatedScenario.TIMEOUT && previousSends == 0) {
            throw new DianTransportException("Simulated: the DIAN did not answer in time", true, null);
        }
        if (scenario == SimulatedScenario.TEMPORARY_FAILURE && previousSends < 2) {
            throw new DianFaultException("s:Receiver", List.of("a:InternalServiceFault"),
                    "Error interno del servicio.", fault());
        }
        return result("SendBillSync", document, scenario);
    }

    /**
     * Status by trackId (the CUFE or CUDE). Found once a send registered it; a send that timed out still
     * registers it, a fault does not.
     *
     * @param document      the document with that unique code, if Cetus has it
     * @param previousSends SendBillSync calls already made for it
     */
    public DianResponse getStatus(String trackId, Optional<SimulatedDocument> document, int previousSends) {
        if (document.isPresent() && registered(SimulatedScenario.of(document.get()), previousSends)) {
            return result("GetStatus", document.get(), SimulatedScenario.of(document.get()));
        }
        String raw = envelope("GetStatus", "<b:ErrorMessage xmlns:c=\"" + ARRAYS_NS + "\"/><b:IsValid>false</b:IsValid>"
                + "<b:StatusCode>66</b:StatusCode><b:StatusDescription>TrackId no existe en los registros de la DIAN."
                + "</b:StatusDescription><b:StatusMessage i:nil=\"true\"/><b:XmlBase64Bytes i:nil=\"true\"/>"
                + "<b:XmlBytes i:nil=\"true\"/><b:XmlDocumentKey i:nil=\"true\"/><b:XmlFileName i:nil=\"true\"/>");
        return new DianResponse(false, "66", "TrackId no existe en los registros de la DIAN.", null, List.of(),
                null, null, raw);
    }

    private static boolean registered(SimulatedScenario scenario, int previousSends) {
        return switch (scenario) {
            case TEMPORARY_FAILURE -> previousSends > 2;
            default -> previousSends > 0;
        };
    }

    private DianResponse result(String operation, SimulatedDocument document, SimulatedScenario scenario) {
        List<String> errors = switch (scenario) {
            case ACCEPTED_WITH_NOTIFICATIONS -> List.of(FAJ43B);
            case REJECTED -> REJECTION;
            case CREDIT_NOTE_REJECTED -> CREDIT_NOTE_REJECTION;
            default -> List.of();
        };
        boolean valid = scenario != SimulatedScenario.REJECTED && scenario != SimulatedScenario.CREDIT_NOTE_REJECTED;
        String statusCode = valid ? "00" : "99";
        String description = valid ? "Procesado Correctamente." : "Validación contiene errores en campos mandatorios.";
        String message = valid
                ? "La " + document.kind().label() + " " + document.displayNumber() + ", ha sido autorizada."
                : "Documento con errores en campos mandatorios.";
        String applicationResponse = Base64.getEncoder().encodeToString(applicationResponse(document, valid, errors));

        StringBuilder messages = new StringBuilder();
        errors.forEach(error -> messages.append("<c:string>").append(escape(error)).append("</c:string>"));
        String raw = envelope(operation, "<b:ErrorMessage xmlns:c=\"" + ARRAYS_NS + "\">" + messages + "</b:ErrorMessage>"
                + "<b:IsValid>" + valid + "</b:IsValid><b:StatusCode>" + statusCode + "</b:StatusCode>"
                + "<b:StatusDescription>" + escape(description) + "</b:StatusDescription>"
                + "<b:StatusMessage>" + escape(message) + "</b:StatusMessage>"
                + "<b:XmlBase64Bytes>" + applicationResponse + "</b:XmlBase64Bytes><b:XmlBytes i:nil=\"true\"/>"
                + "<b:XmlDocumentKey>" + escape(document.uniqueCode()) + "</b:XmlDocumentKey>"
                + "<b:XmlFileName>" + escape(document.fileName()) + "</b:XmlFileName>");
        return new DianResponse(valid, statusCode, description, message, errors, applicationResponse,
                document.uniqueCode(), raw);
    }

    /** The DIAN's ApplicationResponse: 02 validated or 04 rejected, one line per rule. */
    private byte[] applicationResponse(SimulatedDocument document, boolean valid, List<String> errors) {
        OffsetDateTime now = OffsetDateTime.now(clock.withZone(COLOMBIA));
        String id = String.valueOf(10_000_000 + Math.floorMod(document.uniqueCode().hashCode(), 90_000_000));
        StringBuilder lines = new StringBuilder(line(1, "0000", "0"));
        for (int i = 0; i < errors.size(); i++) {
            Matcher rule = RULE.matcher(errors.get(i));
            lines.append(rule.matches() ? line(i + 2, rule.group(1), rule.group(2)) : line(i + 2, "", errors.get(i)));
        }
        String xml = "<ApplicationResponse xmlns=\"urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2\""
                + " xmlns:cac=\"urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2\""
                + " xmlns:cbc=\"urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2\""
                + " xmlns:ext=\"urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2\""
                + " xmlns:sts=\"dian:gov:co:facturaelectronica:Structures-2-1\">"
                + "<ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent><sts:DianExtensions>"
                + "<sts:InvoiceSource><cbc:IdentificationCode listAgencyID=\"6\" listAgencyName=\"United Nations Economic"
                + " Commission for Europe\" listSchemeURI=\"urn:oasis:names:specification:ubl:codelist:gc:"
                + "CountryIdentificationCode-2.1\">CO</cbc:IdentificationCode></sts:InvoiceSource>"
                + "<sts:AuthorizationProvider><sts:AuthorizationProviderID schemeID=\"4\" schemeName=\"31\""
                + " schemeAgencyID=\"195\" schemeAgencyName=\"CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)\">"
                + DIAN_NIT + "</sts:AuthorizationProviderID></sts:AuthorizationProvider>"
                + "</sts:DianExtensions></ext:ExtensionContent></ext:UBLExtension>"
                + "<ext:UBLExtension><ext:ExtensionContent/></ext:UBLExtension></ext:UBLExtensions>"
                + "<cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID><cbc:CustomizationID>1</cbc:CustomizationID>"
                + "<cbc:ProfileID>DIAN 2.1</cbc:ProfileID><cbc:ProfileExecutionID>2</cbc:ProfileExecutionID>"
                + "<cbc:ID>" + id + "</cbc:ID>"
                + "<cbc:UUID schemeName=\"CUDE-SHA384\">" + sha384(document.uniqueCode() + id) + "</cbc:UUID>"
                + "<cbc:IssueDate>" + now.format(DateTimeFormatter.ISO_LOCAL_DATE) + "</cbc:IssueDate>"
                + "<cbc:IssueTime>" + now.format(DateTimeFormatter.ofPattern("HH:mm:ssxxx")) + "</cbc:IssueTime>"
                + "<cbc:Note>" + SIMULATED_NOTE + "</cbc:Note>"
                + party("SenderParty", DIAN_NAME, "4", DIAN_NIT)
                + party("ReceiverParty", document.supplierName(), "1", document.supplierNit())
                + "<cac:DocumentResponse><cac:Response><cbc:ResponseCode>" + (valid ? "02" : "04") + "</cbc:ResponseCode>"
                + "<cbc:Description>" + (valid ? "Documento validado por la DIAN" : "Documento rechazado por la DIAN")
                + "</cbc:Description></cac:Response><cac:DocumentReference><cbc:ID>" + escape(document.number())
                + "</cbc:ID><cbc:UUID schemeName=\"" + document.kind().uniqueCodeScheme() + "\">"
                + escape(document.uniqueCode()) + "</cbc:UUID></cac:DocumentReference>" + lines
                + "</cac:DocumentResponse></ApplicationResponse>";
        Document ar = XmlSupport.parse(xml.getBytes(StandardCharsets.UTF_8));
        Element slot = (Element) ar.getElementsByTagNameNS(
                "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2", "ExtensionContent").item(1);
        signer.sign(ar, slot, keys, XadesSigner.SignerRole.THIRD_PARTY);
        return XmlSupport.serialize(ar);
    }

    private static String party(String element, String name, String checkDigit, String nit) {
        return "<cac:" + element + "><cac:PartyTaxScheme><cbc:RegistrationName>" + escape(name)
                + "</cbc:RegistrationName><cbc:CompanyID schemeID=\"" + checkDigit + "\" schemeName=\"31\">"
                + escape(nit) + "</cbc:CompanyID><cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name>"
                + "</cac:TaxScheme></cac:PartyTaxScheme></cac:" + element + ">";
    }

    private static String line(int number, String code, String description) {
        return "<cac:LineResponse><cac:LineReference><cbc:LineID>" + number + "</cbc:LineID></cac:LineReference>"
                + "<cac:Response><cbc:ResponseCode>" + escape(code) + "</cbc:ResponseCode><cbc:Description>"
                + escape(description) + "</cbc:Description></cac:Response></cac:LineResponse>";
    }

    private static String envelope(String operation, String fields) {
        return "<s:Envelope xmlns:s=\"" + SOAP_NS + "\" xmlns:a=\"" + WSA_NS + "\"><s:Header><a:Action"
                + " s:mustUnderstand=\"1\">http://wcf.dian.colombia/IWcfDianCustomerServices/" + operation
                + "Response</a:Action></s:Header><s:Body><" + operation + "Response xmlns=\"http://wcf.dian.colombia\">"
                + "<" + operation + "Result xmlns:b=\"http://schemas.datacontract.org/2004/07/DianResponse\""
                + " xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\">" + fields + "</" + operation + "Result></"
                + operation + "Response></s:Body></s:Envelope>";
    }

    private static String fault() {
        return "<s:Envelope xmlns:s=\"" + SOAP_NS + "\" xmlns:a=\"" + WSA_NS + "\"><s:Header><a:Action"
                + " s:mustUnderstand=\"1\">" + WSA_NS + "/soap/fault</a:Action></s:Header><s:Body><s:Fault><s:Code>"
                + "<s:Value>s:Receiver</s:Value><s:Subcode><s:Value>a:InternalServiceFault</s:Value></s:Subcode>"
                + "</s:Code><s:Reason><s:Text xml:lang=\"es-CO\">Error interno del servicio.</s:Text></s:Reason>"
                + "</s:Fault></s:Body></s:Envelope>";
    }

    private static String sha384(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-384")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String escape(String value) {
        return value == null ? "" : value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
