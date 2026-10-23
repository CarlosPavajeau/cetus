package com.cantte.cetus.dianmock;

import com.cantte.cetus.dian.DianFaultException;
import com.cantte.cetus.dian.DianOperation;
import com.cantte.cetus.dian.DianResponse;
import com.cantte.cetus.dian.DianSoapClient;
import com.cantte.cetus.dian.DianZip;
import com.cantte.cetus.dian.UploadResponse;
import com.cantte.cetus.dian.simulated.SimulatedDian;
import com.cantte.cetus.signing.KeyMaterial;
import com.cantte.cetus.signing.Pkcs12Loader;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

class DianMockServerTest {

    private MockDian dian;
    private HttpServer server;
    private DianSoapClient client;
    private KeyMaterial keys;
    private String url;

    @BeforeEach
    void start() throws Exception {
        try (var in = getClass().getResourceAsStream("/test-signer.p12")) {
            keys = Pkcs12Loader.load(in.readAllBytes(), "cetus-test".toCharArray());
        }
        restart(false, Duration.ofSeconds(2));
    }

    private void restart(boolean rejectSelfSigned, Duration timeoutDelay) {
        if (server != null) {
            server.stop(0);
        }
        dian = new MockDian(Scenario.ACCEPT, rejectSelfSigned, timeoutDelay, 1,
                new SimulatedDian(keys, Clock.systemUTC()), Clock.systemUTC());
        server = DianMockServer.start(0, dian);
        url = "http://localhost:" + server.getAddress().getPort() + "/WcfDianCustomerServices.svc";
        client = new DianSoapClient(url, Duration.ofSeconds(5), Duration.ofSeconds(5));
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    private static byte[] invoiceZip(String number, String cufe) {
        return invoiceZip(number, cufe, "222222222222");
    }

    private static byte[] invoiceZip(String number, String cufe, String customerId) {
        String xml = """
                <Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
                    xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
                    xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
                    xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
                  <ds:Signature/><cbc:ID>%s</cbc:ID><cbc:UUID>%s</cbc:UUID>
                  <cac:AccountingSupplierParty><cac:Party><cac:PartyTaxScheme>
                    <cbc:RegistrationName>Emisor de prueba</cbc:RegistrationName><cbc:CompanyID>900999999</cbc:CompanyID>
                  </cac:PartyTaxScheme></cac:Party></cac:AccountingSupplierParty>
                  <cac:AccountingCustomerParty><cac:Party><cac:PartyTaxScheme>
                    <cbc:CompanyID>%s</cbc:CompanyID>
                  </cac:PartyTaxScheme></cac:Party></cac:AccountingCustomerParty>
                </Invoice>""".formatted(number, cufe, customerId);
        return DianZip.single("fv1.xml", xml.getBytes(StandardCharsets.UTF_8));
    }

    private static String decoded(String base64) {
        return new String(Base64.getDecoder().decode(base64), StandardCharsets.UTF_8);
    }

    @Test
    void acceptsAnInvoiceAndAnswersItsStatusByCufe() {
        DianResponse response = client.sendBillSync("z1.zip", invoiceZip("SETP1", "cufe-1"), keys);

        assertThat(response.valid()).isTrue();
        assertThat(response.statusCode()).isEqualTo("00");
        assertThat(response.documentKey()).isEqualTo("cufe-1");
        assertThat(response.statusMessage()).isEqualTo("La Factura electrónica SETP-1, ha sido autorizada.");
        assertThat(decoded(response.applicationResponse()))
                .contains("<cbc:ResponseCode>02</cbc:ResponseCode>", "ds:Signature", "sin validez fiscal");
        assertThat(client.getStatus("cufe-1", keys).valid()).isTrue();
        assertThat(client.getStatus("unknown", keys).statusCode()).isEqualTo("66");
    }

    @Test
    void answersLikeTheSandboxForItsScenarioCustomers() {
        DianResponse response = client.sendBillSync("z1.zip", invoiceZip("SETP1", "cufe-1", "1000000002"), keys);

        assertThat(response.valid()).isFalse();
        assertThat(response.statusCode()).isEqualTo("99");
        assertThat(response.errors()).anyMatch(error -> error.startsWith("Regla: FAK26"))
                .anyMatch(error -> error.startsWith("Regla: FAB10a"));
        assertThat(decoded(response.applicationResponse())).contains("<cbc:ResponseCode>04</cbc:ResponseCode>");
        assertThat(client.getStatus("cufe-1", keys).valid()).isFalse();
    }

    @Test
    void failsTheFirstTwoSendsOfTheTemporaryFailureCustomer() {
        byte[] zip = invoiceZip("SETP1", "cufe-1", "1000000004");

        DianFaultException first = catchThrowableOfType(DianFaultException.class,
                () -> client.sendBillSync("z1.zip", zip, keys));
        assertThat(client.getStatus("cufe-1", keys).statusCode()).isEqualTo("66");
        DianFaultException second = catchThrowableOfType(DianFaultException.class,
                () -> client.sendBillSync("z1.zip", zip, keys));
        DianResponse third = client.sendBillSync("z1.zip", zip, keys);

        assertThat(first.retryable()).isTrue();
        assertThat(second.retryable()).isTrue();
        assertThat(third.valid()).isTrue();
    }

    @Test
    void registersTheTimeoutCustomerButAnswersLate() {
        restart(false, Duration.ofMillis(300));
        long started = System.nanoTime();

        DianResponse late = client.sendBillSync("z1.zip", invoiceZip("SETP1", "cufe-1", "1000000003"), keys);

        assertThat(Duration.ofNanos(System.nanoTime() - started)).isGreaterThanOrEqualTo(Duration.ofMillis(300));
        assertThat(late.valid()).isTrue();
        assertThat(client.getStatus("cufe-1", keys).valid()).isTrue();
    }

    @Test
    void delaysEverySoapAnswerByTheConfiguredLatency() throws Exception {
        URI control = URI.create("http://localhost:" + server.getAddress().getPort() + "/__mock/latency?value=PT0.3S");
        HttpResponse<String> set = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(control).POST(HttpRequest.BodyPublishers.noBody()).build(),
                HttpResponse.BodyHandlers.ofString());
        long started = System.nanoTime();

        DianResponse response = client.sendBillSync("z1.zip", invoiceZip("SETP1", "cufe-1"), keys);

        assertThat(set.statusCode()).isEqualTo(200);
        assertThat(response.valid()).isTrue();
        assertThat(Duration.ofNanos(System.nanoTime() - started)).isGreaterThanOrEqualTo(Duration.ofMillis(300));
    }

    @Test
    void rejectsADuplicateButKeepsTheOriginalStatus() {
        client.sendBillSync("z1.zip", invoiceZip("SETP1", "cufe-1"), keys);

        DianResponse duplicate = client.sendBillSync("z2.zip", invoiceZip("SETP1", "cufe-1"), keys);

        assertThat(duplicate.valid()).isFalse();
        assertThat(duplicate.errors()).anyMatch(error -> error.startsWith("Regla: 90"));
        assertThat(client.getStatus("cufe-1", keys).valid()).isTrue();
    }

    @Test
    void rejectsStructuralProblemsWithMockMessages() {
        byte[] unsigned = DianZip.single("fv1.xml", "<Invoice/>".getBytes(StandardCharsets.UTF_8));

        DianResponse response = client.sendBillSync("z1.zip", unsigned, keys);

        assertThat(response.valid()).isFalse();
        assertThat(response.statusCode()).isEqualTo("99");
        assertThat(response.errors()).isNotEmpty().allMatch(error -> error.startsWith("Mock:"));
    }

    @Test
    void reportsTheTestSetAsProcessingFirst() {
        UploadResponse upload = client.sendTestSetAsync("z1.zip", invoiceZip("SETP1", "cufe-1"), "set-1", keys);

        List<DianResponse> first = client.getStatusZip(upload.zipKey(), keys);
        List<DianResponse> second = client.getStatusZip(upload.zipKey(), keys);

        assertThat(first.get(0).statusCode()).isNull();
        assertThat(first.get(0).statusDescription()).contains("en proceso");
        assertThat(second.get(0).valid()).isTrue();
    }

    @Test
    void answersTheClientFaultScenarioLikeTheDian() {
        dian.scenario(Scenario.CLIENT_FAULT);

        DianFaultException fault = catchThrowableOfType(DianFaultException.class,
                () -> client.sendBillSync("z1.zip", invoiceZip("SETP1", "cufe-1"), keys));

        assertThat(fault.code()).isEqualTo("s:Client");
        assertThat(fault.retryable()).isFalse();
    }

    @Test
    void keepsServerFaultsRetryable() {
        dian.scenario(Scenario.SERVER_FAULT);

        DianFaultException fault = catchThrowableOfType(DianFaultException.class,
                () -> client.getStatus("cufe-1", keys));

        assertThat(fault.retryable()).isTrue();
    }

    @Test
    void rejectsAnEnvelopeAlteredAfterSigning() throws Exception {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("trackId", "cufe-1");
        String signed = new String(client.buildSignedEnvelope(DianOperation.GET_STATUS, params, keys),
                StandardCharsets.UTF_8);
        String tampered = signed.replace(url, "http://evil.example/WcfDianCustomerServices.svc");

        HttpResponse<String> response = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create(url)).POST(HttpRequest.BodyPublishers.ofString(tampered)).build(),
                HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(500);
        assertThat(response.body()).contains("s:Client");
    }

    @Test
    void canRejectSelfSignedCertificatesLikeTheDian() {
        restart(true, Duration.ofSeconds(2));

        DianFaultException fault = catchThrowableOfType(DianFaultException.class,
                () -> client.getStatus("cufe-1", keys));

        assertThat(fault).isNotNull();
        assertThat(fault.isClientFault()).isTrue();
    }
}
