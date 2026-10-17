package com.cantte.cetus.dian;

import com.cantte.cetus.signing.KeyMaterial;
import com.cantte.cetus.signing.Pkcs12Loader;
import com.cantte.cetus.signing.XmlSupport;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import javax.xml.crypto.dsig.XMLSignature;
import javax.xml.crypto.dsig.XMLSignatureFactory;
import javax.xml.crypto.dsig.dom.DOMValidateContext;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

class DianSoapClientTest {

    private static KeyMaterial keys() throws Exception {
        try (var in = DianSoapClientTest.class.getResourceAsStream("/test-signer.p12")) {
            return Pkcs12Loader.load(in.readAllBytes(), "cetus-test".toCharArray());
        }
    }

    @Test
    void signsTheAddressingToHeader() throws Exception {
        KeyMaterial keys = keys();
        var client = new DianSoapClient(DianEndpoint.TEST, Duration.ofSeconds(5), Duration.ofSeconds(5));
        Map<String, String> params = new LinkedHashMap<>();
        params.put("fileName", "z0900123456000260000001a.zip");
        params.put("contentFile", "UEsDBA==");

        Document envelope = XmlSupport.parse(client.buildSignedEnvelope(DianOperation.SEND_BILL_SYNC, params, keys));

        Element to = (Element) envelope.getElementsByTagNameNS(SoapEnvelopeBuilder.WSA_NS, "To").item(0);
        assertThat(to.getTextContent()).isEqualTo(DianEndpoint.TEST.url());
        Element signature = (Element) envelope.getElementsByTagNameNS(XMLSignature.XMLNS, "Signature").item(0);
        DOMValidateContext context = new DOMValidateContext(keys.certificate().getPublicKey(), signature);
        context.setIdAttributeNS(to, WsSecuritySigner.WSU_NS, "Id");
        assertThat(XMLSignatureFactory.getInstance("DOM").unmarshalXMLSignature(context).validate(context)).isTrue();
    }

    @Test
    void parsesASendBillSyncResponse() {
        String raw = """
                <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body>
                <SendBillSyncResponse xmlns="http://wcf.dian.colombia"><SendBillSyncResult
                    xmlns:b="http://schemas.datacontract.org/2004/07/DianResponse"
                    xmlns:c="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
                  <b:ErrorMessage><c:string>Regla: FAJ43b, Notificación: Nombre informado no corresponde</c:string></b:ErrorMessage>
                  <b:IsValid>true</b:IsValid>
                  <b:StatusCode>00</b:StatusCode>
                  <b:StatusDescription>Procesado Correctamente.</b:StatusDescription>
                  <b:XmlBase64Bytes>PEFwcGxpY2F0aW9uUmVzcG9uc2UvPg==</b:XmlBase64Bytes>
                  <b:XmlDocumentKey>abc123</b:XmlDocumentKey>
                </SendBillSyncResult></SendBillSyncResponse></s:Body></s:Envelope>""";

        DianResponse response = DianResponseParser.single(raw, "SendBillSyncResult");

        assertThat(response.valid()).isTrue();
        assertThat(response.statusCode()).isEqualTo("00");
        assertThat(response.errors()).hasSize(1);
        assertThat(response.documentKey()).isEqualTo("abc123");
    }

    @Test
    void parsesAClientFaultAsNotRetryable() {
        String raw = """
                <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body><s:Fault>
                <s:Code><s:Value>s:Client</s:Value></s:Code>
                <s:Reason><s:Text xml:lang="en-US">The creator of this fault did not specify a Reason.</s:Text></s:Reason>
                </s:Fault></s:Body></s:Envelope>""";

        DianFaultException fault = catchThrowableOfType(DianFaultException.class,
                () -> DianResponseParser.single(raw, "SendBillSyncResult"));

        assertThat(fault.code()).isEqualTo("s:Client");
        assertThat(fault.retryable()).isFalse();
        assertThat(fault.getMessage()).startsWith("SOAP fault s:Client: The creator of this fault");
    }

    @Test
    void keepsServerFaultsRetryableWithSubcodes() {
        String raw = """
                <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
                    xmlns:a="http://schemas.microsoft.com/net/2005/12/windowscommunicationfoundation/dispatcher">
                <s:Body><s:Fault>
                <s:Code><s:Value>s:Receiver</s:Value><s:Subcode><s:Value>a:InternalServiceFault</s:Value></s:Subcode></s:Code>
                <s:Reason><s:Text xml:lang="en-US">Internal error</s:Text></s:Reason>
                </s:Fault></s:Body></s:Envelope>""";

        DianFaultException fault = catchThrowableOfType(DianFaultException.class,
                () -> DianResponseParser.single(raw, "SendBillSyncResult"));

        assertThat(fault.retryable()).isTrue();
        assertThat(fault.getMessage()).isEqualTo("SOAP fault s:Receiver/a:InternalServiceFault: Internal error");
    }
}
