package com.cantte.cetus.dian;

import com.cantte.cetus.signing.KeyMaterial;
import com.cantte.cetus.signing.XmlSupport;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Client for IWcfDianCustomerServices. Stateless and thread-safe; one instance per endpoint.
 * The caller provides the key material of the issuer (or of the technology provider).
 */
public final class DianSoapClient {

    private final String url;
    private final HttpClient http;
    private final Duration requestTimeout;
    private final WsSecuritySigner signer;

    public DianSoapClient(DianEndpoint endpoint, Duration connectTimeout, Duration requestTimeout) {
        this(endpoint.url(), connectTimeout, requestTimeout);
    }

    /** Any URL speaking the DIAN contract, e.g. the local mock ({@code apps/dian-mock}). */
    public DianSoapClient(String url, Duration connectTimeout, Duration requestTimeout) {
        this(url, HttpClient.newBuilder().connectTimeout(connectTimeout).build(), requestTimeout, Clock.systemUTC());
    }

    DianSoapClient(String url, HttpClient http, Duration requestTimeout, Clock clock) {
        this.url = url;
        this.http = http;
        this.requestTimeout = requestTimeout;
        this.signer = new WsSecuritySigner(clock, 60);
    }

    public DianResponse sendBillSync(String zipFileName, byte[] zip, KeyMaterial keys) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("fileName", zipFileName);
        params.put("contentFile", Base64.getEncoder().encodeToString(zip));
        String raw = call(DianOperation.SEND_BILL_SYNC, params, keys);
        return DianResponseParser.single(raw, "SendBillSyncResult");
    }

    public UploadResponse sendTestSetAsync(String zipFileName, byte[] zip, String testSetId, KeyMaterial keys) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("fileName", zipFileName);
        params.put("contentFile", Base64.getEncoder().encodeToString(zip));
        params.put("testSetId", testSetId);
        String raw = call(DianOperation.SEND_TEST_SET_ASYNC, params, keys);
        return DianResponseParser.upload(raw, "SendTestSetAsyncResult");
    }

    /** Status by trackId; for documents sent with SendBillSync the trackId is the CUFE/CUDE. */
    public DianResponse getStatus(String trackId, KeyMaterial keys) {
        String raw = call(DianOperation.GET_STATUS, Map.of("trackId", trackId), keys);
        return DianResponseParser.single(raw, "GetStatusResult");
    }

    /** Status of an asynchronous upload, by the ZipKey returned by SendTestSetAsync. */
    public List<DianResponse> getStatusZip(String zipKey, KeyMaterial keys) {
        String raw = call(DianOperation.GET_STATUS_ZIP, Map.of("trackId", zipKey), keys);
        return DianResponseParser.list(raw, "GetStatusZipResult");
    }

    /** Builds and signs the envelope without sending it. Useful for tests and debugging. */
    public byte[] buildSignedEnvelope(DianOperation operation, Map<String, String> params, KeyMaterial keys) {
        SoapEnvelopeBuilder.Envelope envelope = SoapEnvelopeBuilder.build(url, operation, params);
        signer.sign(envelope, keys);
        return XmlSupport.serialize(envelope.document());
    }

    private String call(DianOperation operation, Map<String, String> params, KeyMaterial keys) {
        byte[] body = buildSignedEnvelope(operation, params, keys);
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(requestTimeout)
                .header("Content-Type", "application/soap+xml;charset=UTF-8;action=\"" + operation.action() + "\"")
                .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                .build();
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 500 && !response.body().contains("Fault")) {
                throw new DianTransportException("DIAN returned HTTP " + response.statusCode(), false, null);
            }
            return response.body();
        } catch (HttpTimeoutException e) {
            throw new DianTransportException("Timeout calling " + operation.operationName(), true, e);
        } catch (IOException e) {
            throw new DianTransportException("I/O error calling " + operation.operationName() + ": " + e.getMessage(), false, e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new DianTransportException("Interrupted calling " + operation.operationName(), false, e);
        }
    }
}
