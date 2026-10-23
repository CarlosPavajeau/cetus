package com.cantte.cetus.dianmock;

import com.cantte.cetus.dian.DianFaultException;
import com.cantte.cetus.dian.DianResponse;
import com.cantte.cetus.dian.DianTransportException;
import com.cantte.cetus.dian.simulated.SimulatedDian;
import com.cantte.cetus.dian.simulated.SimulatedDocument;
import com.cantte.cetus.signing.XmlSupport;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

import javax.xml.crypto.dsig.XMLSignature;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * In-memory DIAN: answers SendBillSync, SendTestSetAsync, GetStatus, GetStatusZip and GetNumberingRange
 * (always the habilitación range).
 * A document that passes the mock's own checks is answered by {@link SimulatedDian}, the sandbox's simulator: its
 * outcome depends on the customer's identification number, like in SANDBOX, with the DIAN's signed
 * ApplicationResponse.
 * Error texts produced by the mock's own checks start with "Mock:" so they are never
 * mistaken for real DIAN validation rules.
 */
final class MockDian {

    private static final String DIAN_CLIENT_FAULT = "The creator of this fault did not specify a Reason.";
    private static final String UBL_CBC_NS = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";

    /** HTTP status and SOAP body to answer with, plus a one-line summary for the log. */
    record Reply(int status, String body, String summary) {
    }

    /** What was received, for {@code GET /__mock/documents}. */
    record Received(Instant at, String operation, String fileName, String number, String documentKey,
                    String outcome) {
    }

    /** {@code simulated} is null when the XML could not be read, and then {@code errors} says why. */
    private record Submission(String fileName, String number, String documentKey, SimulatedDocument simulated,
                              List<String> errors) {
    }

    /** {@code late}: the simulator timed out this send, so the answer comes after the worker gave up. */
    private record Decision(Soap.Result result, boolean late) {
    }

    private record PendingZip(Soap.Result result, AtomicInteger polls) {
    }

    private final WsSecurityVerifier verifier;
    private final SimulatedDian simulator;
    private final boolean rejectSelfSigned;
    private final Duration timeoutDelay;
    private final int pollsBeforeDone;
    private volatile Scenario scenario;
    private volatile Duration latency = Duration.ZERO;

    private final Map<String, Soap.Result> byDocumentKey = new ConcurrentHashMap<>();
    private final Map<String, PendingZip> byZipKey = new ConcurrentHashMap<>();
    private final Map<String, AtomicInteger> sends = new ConcurrentHashMap<>();
    private final List<Received> received = new CopyOnWriteArrayList<>();

    MockDian(Scenario scenario, boolean rejectSelfSigned, Duration timeoutDelay, int pollsBeforeDone,
             SimulatedDian simulator, Clock clock) {
        this.scenario = scenario;
        this.simulator = simulator;
        this.rejectSelfSigned = rejectSelfSigned;
        this.timeoutDelay = timeoutDelay;
        this.pollsBeforeDone = pollsBeforeDone;
        this.verifier = new WsSecurityVerifier(clock);
    }

    Scenario scenario() {
        return scenario;
    }

    void scenario(Scenario scenario) {
        this.scenario = scenario;
    }

    /** How long every SOAP answer waits, to approximate the real DIAN's response time under load. */
    Duration latency() {
        return latency;
    }

    void latency(Duration latency) {
        if (latency.isNegative()) {
            throw new IllegalArgumentException("latency must not be negative");
        }
        this.latency = latency;
    }

    List<Received> received() {
        return List.copyOf(received);
    }

    void reset() {
        byDocumentKey.clear();
        byZipKey.clear();
        sends.clear();
        received.clear();
    }

    Reply handle(byte[] request) {
        Document envelope;
        try {
            envelope = XmlSupport.parse(request);
        } catch (IllegalArgumentException e) {
            return clientFault("?", "request is not XML: " + e.getMessage());
        }
        Element call = firstChildElement(firstChild(envelope.getDocumentElement(), Soap.SOAP_NS, "Body"));
        String operation = call == null ? "?" : call.getLocalName();

        WsSecurityVerifier.Result security = verifier.verify(envelope);
        if (!security.ok()) {
            return clientFault(operation, "WS-Security: " + security.problem());
        }
        if (security.selfSigned()) {
            String subject = security.certificate().getSubjectX500Principal().getName();
            if (rejectSelfSigned) {
                return clientFault(operation, "self-signed certificate (" + subject + "), the DIAN only trusts"
                        + " ONAC-accredited CAs");
            }
            DianMockServer.log("note: self-signed certificate " + subject + " accepted; the real DIAN rejects it");
        }

        Map<String, String> params = parameters(call);
        switch (scenario) {
            case CLIENT_FAULT -> {
                return clientFault(operation, "forced by scenario client-fault");
            }
            case SERVER_FAULT -> {
                return new Reply(500, Soap.fault("s:Receiver", "a:InternalServiceFault",
                        "The server was unable to process the request due to an internal error."),
                        operation + " -> s:Receiver fault (scenario server-fault)");
            }
            default -> {
            }
        }
        return switch (operation) {
            case "SendBillSync" -> sendBillSync(params);
            case "SendTestSetAsync" -> sendTestSetAsync(params);
            case "GetStatus" -> getStatus(params.get("trackId"));
            case "GetStatusZip" -> getStatusZip(params.get("trackId"));
            case "GetNumberingRange" -> new Reply(200, Soap.testNumberingRange(),
                    "GetNumberingRange " + params.get("accountCode") + " -> SETP 990000000-995000000");
            default -> new Reply(500, Soap.fault("s:Sender", "a:ActionNotSupported",
                    "The message with Action '' cannot be processed at the receiver."),
                    operation + " -> s:Sender fault (unknown operation)");
        };
    }

    private Reply sendBillSync(Map<String, String> params) {
        Submission submission = inspect(params.get("fileName"), params.get("contentFile"));
        Decision decision;
        try {
            decision = decide(submission);
        } catch (DianFaultException e) {
            return simulatedFault("SendBillSync", submission, e);
        }
        Soap.Result result = decision.result();
        remember(submission, result);
        record("SendBillSync", submission, result);
        return delayed(new Reply(200, Soap.single("SendBillSync", result),
                "SendBillSync " + submission.number() + " -> " + outcome(result)), decision.late());
    }

    private Reply sendTestSetAsync(Map<String, String> params) {
        if (params.get("testSetId") == null || params.get("testSetId").isBlank()) {
            return new Reply(200, Soap.upload("SendTestSetAsync", null, List.of("Mock: testSetId es obligatorio")),
                    "SendTestSetAsync -> no ZipKey (missing testSetId)");
        }
        Submission submission = inspect(params.get("fileName"), params.get("contentFile"));
        Decision decision;
        try {
            decision = decide(submission);
        } catch (DianFaultException e) {
            return simulatedFault("SendTestSetAsync", submission, e);
        }
        Soap.Result result = decision.result();
        String zipKey = UUID.randomUUID().toString();
        byZipKey.put(zipKey, new PendingZip(result, new AtomicInteger()));
        remember(submission, result);
        record("SendTestSetAsync", submission, result);
        return delayed(new Reply(200, Soap.upload("SendTestSetAsync", zipKey, List.of()),
                "SendTestSetAsync " + submission.number() + " -> ZipKey " + zipKey + " (will be " + outcome(result)
                        + ")"), decision.late());
    }

    private Reply getStatus(String trackId) {
        Soap.Result stored = trackId == null ? null : byDocumentKey.get(trackId);
        Soap.Result result = stored != null ? stored : unknownTrackId(trackId);
        return new Reply(200, Soap.single("GetStatus", result), "GetStatus " + trackId + " -> " + outcome(result));
    }

    private Reply getStatusZip(String zipKey) {
        PendingZip pending = zipKey == null ? null : byZipKey.get(zipKey);
        if (pending == null) {
            Soap.Result unknown = unknownTrackId(zipKey);
            return new Reply(200, Soap.list("GetStatusZip", List.of(unknown)),
                    "GetStatusZip " + zipKey + " -> unknown");
        }
        if (pending.polls().incrementAndGet() <= pollsBeforeDone) {
            Soap.Result processing = new Soap.Result(false, null, "Batch en proceso de validación.", null,
                    List.of(), null, null, null);
            return new Reply(200, Soap.list("GetStatusZip", List.of(processing)),
                    "GetStatusZip " + zipKey + " -> en proceso");
        }
        return new Reply(200, Soap.list("GetStatusZip", List.of(pending.result())),
                "GetStatusZip " + zipKey + " -> " + outcome(pending.result()));
    }

    /** Structural checks only: the mock does not implement the DIAN validation rules. */
    private Submission inspect(String fileName, String contentFile) {
        List<String> errors = new ArrayList<>();
        if (fileName == null || !fileName.toLowerCase().endsWith(".zip")) {
            errors.add("Mock: fileName debe terminar en .zip (recibido: " + fileName + ")");
        }
        byte[] xml = null;
        String entryName = null;
        int xmlEntries = 0;
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(
                Base64.getMimeDecoder().decode(contentFile == null ? "" : contentFile)))) {
            for (ZipEntry entry; (entry = zip.getNextEntry()) != null; ) {
                if (entry.getName().toLowerCase().endsWith(".xml")) {
                    xmlEntries++;
                    entryName = entry.getName().replaceFirst("(?i)\\.xml$", "");
                    xml = zip.readAllBytes();
                }
            }
        } catch (IOException | IllegalArgumentException e) {
            errors.add("Mock: contentFile no es un zip en base64 válido: " + e.getMessage());
        }
        if (xmlEntries != 1 && errors.isEmpty()) {
            errors.add("Mock: el zip debe contener exactamente un XML (contiene " + xmlEntries + ")");
        }
        if (xml == null) {
            return new Submission(fileName, null, null, null, errors);
        }

        Document document;
        try {
            document = XmlSupport.parse(xml);
        } catch (IllegalArgumentException e) {
            errors.add("Mock: el XML del zip no es válido: " + e.getMessage());
            return new Submission(fileName, null, null, null, errors);
        }
        Element root = document.getDocumentElement();
        String number = text(root, "ID");
        String documentKey = text(root, "UUID");
        if (!List.of("Invoice", "CreditNote", "DebitNote").contains(root.getLocalName())) {
            errors.add("Mock: elemento raíz inesperado " + root.getLocalName());
        }
        if (number == null) {
            errors.add("Mock: falta cbc:ID (número del documento)");
        }
        if (documentKey == null) {
            errors.add("Mock: falta cbc:UUID (CUFE/CUDE)");
        }
        if (document.getElementsByTagNameNS(XMLSignature.XMLNS, "Signature").getLength() == 0) {
            errors.add("Mock: el documento no tiene firma ds:Signature");
        }
        SimulatedDocument simulated = null;
        if (errors.isEmpty()) {
            try {
                simulated = SimulatedDocument.fromXml(entryName, xml);
            } catch (IllegalArgumentException e) {
                errors.add("Mock: el simulador no pudo leer el documento: " + e.getMessage());
            }
        }
        return new Submission(fileName, number, documentKey, simulated, errors);
    }

    /**
     * @throws DianFaultException the simulator's server fault, for a customer that asks for one
     */
    private Decision decide(Submission submission) {
        List<String> errors = new ArrayList<>(submission.errors());
        Soap.Result previous = submission.documentKey() == null ? null : byDocumentKey.get(submission.documentKey());
        if (previous != null && previous.valid()) {
            errors.add("Regla: 90, Rechazo: Documento procesado anteriormente.");
        }
        if (scenario == Scenario.REJECT) {
            errors.add("Mock: rechazo forzado por el escenario reject");
        }
        if (errors.isEmpty()) {
            return simulate(submission);
        }
        String applicationResponse = submission.documentKey() == null ? null : Base64.getEncoder().encodeToString(
                Soap.applicationResponse(submission.documentKey(), false, errors).getBytes(StandardCharsets.UTF_8));
        return new Decision(new Soap.Result(false, "99", "Validación contiene errores en campos mandatorios.",
                "Documento con errores en campos mandatorios.", List.copyOf(errors),
                applicationResponse, submission.documentKey(), submission.fileName()), false);
    }

    /**
     * The sandbox's answer. A timed-out send is still registered, as the simulator's GetStatus reports it, so
     * the mock answers with that result, late.
     */
    private Decision simulate(Submission submission) {
        // A global scenario wins over the customer's: under it, the document is answered as a plain acceptance.
        SimulatedDocument document = scenario == Scenario.ACCEPT
                ? submission.simulated()
                : withoutCustomer(submission.simulated());
        int previousSends = sends.computeIfAbsent(submission.documentKey(), key -> new AtomicInteger())
                .getAndIncrement();
        try {
            return new Decision(result(simulator.sendBillSync(document, previousSends), submission), false);
        } catch (DianTransportException e) {
            DianResponse registered = simulator.getStatus(submission.documentKey(), Optional.of(document),
                    previousSends + 1);
            return new Decision(result(registered, submission), true);
        }
    }

    /** The simulator picks its scenario by customer; with none, it accepts. */
    private static SimulatedDocument withoutCustomer(SimulatedDocument document) {
        return new SimulatedDocument(document.kind(), document.number(), document.uniqueCode(), document.fileName(),
                document.supplierNit(), document.supplierName(), null);
    }

    private static Soap.Result result(DianResponse response, Submission submission) {
        return new Soap.Result(response.valid(), response.statusCode(), response.statusDescription(),
                response.statusMessage(), response.errors(), response.applicationResponse(), response.documentKey(),
                submission.fileName());
    }

    /** A fault is not registered: the document stays unknown to GetStatus, as with the DIAN. */
    private Reply simulatedFault(String operation, Submission submission, DianFaultException fault) {
        record(operation, submission, "fault (" + fault.code() + ")");
        return new Reply(500, fault.rawXml(), operation + " " + submission.number() + " -> " + fault.code()
                + " fault (simulated for the customer)");
    }

    /**
     * In the timeout scenario, or when the simulator times out this send, the work is done (as the DIAN may do)
     * but the answer comes too late.
     */
    private Reply delayed(Reply reply, boolean late) {
        if (scenario == Scenario.TIMEOUT || late) {
            DianMockServer.log("timeout: holding the answer for " + timeoutDelay.toSeconds() + "s");
            try {
                Thread.sleep(timeoutDelay);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        return reply;
    }

    private Reply clientFault(String operation, String realCause) {
        return new Reply(500, Soap.fault("s:Client", null, DIAN_CLIENT_FAULT),
                operation + " -> s:Client fault, real cause: " + realCause);
    }

    private static Soap.Result unknownTrackId(String trackId) {
        return new Soap.Result(false, "66", "TrackId no existe en los registros de la DIAN.", null,
                List.of(), null, trackId, null);
    }

    /** A duplicate is rejected, but GetStatus keeps answering with the original acceptance. */
    private void remember(Submission submission, Soap.Result result) {
        if (submission.documentKey() != null) {
            byDocumentKey.merge(submission.documentKey(), result, (old, latest) -> old.valid() ? old : latest);
        }
    }

    private void record(String operation, Submission submission, Soap.Result result) {
        record(operation, submission, outcome(result));
    }

    private void record(String operation, Submission submission, String outcome) {
        received.add(new Received(Instant.now(), operation, submission.fileName(), submission.number(),
                submission.documentKey(), outcome));
    }

    private static String outcome(Soap.Result result) {
        return result.valid() ? "accepted (" + result.statusCode() + ")"
                : "rejected (" + result.statusCode() + ")" + (result.errors().isEmpty() ? "" : ": "
                + String.join(" | ", result.errors()));
    }

    private static Map<String, String> parameters(Element call) {
        Map<String, String> params = new HashMap<>();
        if (call == null) {
            return params;
        }
        for (Node node = call.getFirstChild(); node != null; node = node.getNextSibling()) {
            if (node.getNodeType() == Node.ELEMENT_NODE) {
                params.put(node.getLocalName(), node.getTextContent());
            }
        }
        return params;
    }

    private static String text(Element parent, String localName) {
        for (Node node = parent.getFirstChild(); node != null; node = node.getNextSibling()) {
            if (node.getNodeType() == Node.ELEMENT_NODE && UBL_CBC_NS.equals(node.getNamespaceURI())
                    && localName.equals(node.getLocalName())) {
                String value = node.getTextContent().trim();
                return value.isEmpty() ? null : value;
            }
        }
        return null;
    }

    private static Element firstChild(Element parent, String namespace, String localName) {
        for (Node node = parent.getFirstChild(); node != null; node = node.getNextSibling()) {
            if (node.getNodeType() == Node.ELEMENT_NODE && namespace.equals(node.getNamespaceURI())
                    && localName.equals(node.getLocalName())) {
                return (Element) node;
            }
        }
        return null;
    }

    private static Element firstChildElement(Element parent) {
        if (parent == null) {
            return null;
        }
        for (Node node = parent.getFirstChild(); node != null; node = node.getNextSibling()) {
            if (node.getNodeType() == Node.ELEMENT_NODE) {
                return (Element) node;
            }
        }
        return null;
    }
}
