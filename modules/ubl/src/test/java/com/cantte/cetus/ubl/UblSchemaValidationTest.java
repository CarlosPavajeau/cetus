package com.cantte.cetus.ubl;

import com.cantte.cetus.signing.Pkcs12Loader;
import com.cantte.cetus.signing.XadesSigner;
import com.cantte.cetus.signing.XmlSupport;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.xml.sax.ErrorHandler;
import org.xml.sax.SAXParseException;

import javax.xml.XMLConstants;
import javax.xml.transform.Source;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import javax.xml.validation.Validator;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Validates the generated UBL against the XSDs of the DIAN toolbox (src/main/xsd).
 * Skipped automatically when the XSDs are not present, so the build never depends on them.
 * The generated XML is written to build/ubl/ to inspect it when a rule fails.
 */
class UblSchemaValidationTest {

    private static final Path XSD_ROOT = Path.of("src/main/xsd");
    private static final Path OUTPUT = Path.of("build/ubl");
    private static final String STS_NAMESPACE = "dian:gov:co:facturaelectronica:Structures-2-1";
    private static final Pattern QUOTED_DIGIT = Pattern.compile("'(\\d)'");

    @Test
    void invoiceIsValidAgainstUblSchema() throws Exception {
        Optional<Path> invoiceXsd = findByName("UBL-Invoice-2.1.xsd");
        assumeTrue(invoiceXsd.isPresent(), "UBL-Invoice-2.1.xsd not found in src/main/xsd");

        byte[] xml = XmlSupport.serialize(sampleDocument());
        Files.createDirectories(OUTPUT);
        Files.write(OUTPUT.resolve("sample-invoice.xml"), xml);

        List<String> errors = validate(invoiceXsd.get(), new StreamSource(new ByteArrayInputStream(xml)));
        assertThat(errors).as("XSD errors, see build/ubl/sample-invoice.xml").isEmpty();
    }

    /**
     * The document that reaches the DIAN is the signed one: the signature slot is added and the XAdES
     * signature inserted after marshalling, so validate that result too.
     */
    @Test
    void signedInvoiceIsValidAgainstUblSchema() throws Exception {
        Optional<Path> invoiceXsd = findByName("UBL-Invoice-2.1.xsd");
        assumeTrue(invoiceXsd.isPresent(), "UBL-Invoice-2.1.xsd not found in src/main/xsd");

        Document document = sampleDocument();
        try (var in = getClass().getResourceAsStream("/test-signer.p12")) {
            var keys = Pkcs12Loader.load(in.readAllBytes(), "cetus-test".toCharArray());
            new XadesSigner().sign(document, UblMarshaller.signatureSlot(document), keys, XadesSigner.SignerRole.SUPPLIER);
        }
        byte[] xml = XmlSupport.serialize(document);
        Files.createDirectories(OUTPUT);
        Files.write(OUTPUT.resolve("sample-invoice-signed.xml"), xml);

        List<String> errors = validate(invoiceXsd.get(), new StreamSource(new ByteArrayInputStream(xml)));
        assertThat(errors).as("XSD errors, see build/ubl/sample-invoice-signed.xml").isEmpty();
    }

    @Test
    void creditNoteIsValidAgainstUblSchema() throws Exception {
        Optional<Path> creditNoteXsd = findByName("UBL-CreditNote-2.1.xsd");
        assumeTrue(creditNoteXsd.isPresent(), "UBL-CreditNote-2.1.xsd not found in src/main/xsd");

        byte[] xml = XmlSupport.serialize(sampleCreditNoteDocument());
        Files.createDirectories(OUTPUT);
        Files.write(OUTPUT.resolve("sample-credit-note.xml"), xml);

        List<String> errors = validate(creditNoteXsd.get(), new StreamSource(new ByteArrayInputStream(xml)));
        assertThat(errors).as("XSD errors, see build/ubl/sample-credit-note.xml").isEmpty();
    }

    @Test
    void signedCreditNoteIsValidAgainstUblSchema() throws Exception {
        Optional<Path> creditNoteXsd = findByName("UBL-CreditNote-2.1.xsd");
        assumeTrue(creditNoteXsd.isPresent(), "UBL-CreditNote-2.1.xsd not found in src/main/xsd");

        Document document = sampleCreditNoteDocument();
        try (var in = getClass().getResourceAsStream("/test-signer.p12")) {
            var keys = Pkcs12Loader.load(in.readAllBytes(), "cetus-test".toCharArray());
            new XadesSigner().sign(document, UblMarshaller.signatureSlot(document), keys, XadesSigner.SignerRole.SUPPLIER);
        }
        byte[] xml = XmlSupport.serialize(document);
        Files.createDirectories(OUTPUT);
        Files.write(OUTPUT.resolve("sample-credit-note-signed.xml"), xml);

        List<String> errors = validate(creditNoteXsd.get(), new StreamSource(new ByteArrayInputStream(xml)));
        assertThat(errors).as("XSD errors, see build/ubl/sample-credit-note-signed.xml").isEmpty();
    }

    /** Credit notes carry no InvoiceControl; the DIAN schema must accept the extensions without it. */
    @Test
    void creditNoteDianExtensionsAreValidAgainstDianSchema() throws Exception {
        Optional<Path> dianXsd = findByTargetNamespace(STS_NAMESPACE);
        assumeTrue(dianXsd.isPresent(), "No XSD with the DIAN structures namespace in src/main/xsd");

        Node extensions = sampleCreditNoteDocument().getElementsByTagNameNS(STS_NAMESPACE, "DianExtensions").item(0);
        List<String> errors = withoutKnownCoId2Deviations(validate(dianXsd.get(), new DOMSource(extensions)));
        assertThat(errors).as("XSD errors in the credit note sts:DianExtensions").isEmpty();
    }

    /**
     * UBL usually declares ExtensionContent as xs:any with processContents="skip", so the
     * validation above does not look inside it. This test validates sts:DianExtensions on its own.
     */
    @Test
    void dianExtensionsAreValidAgainstDianSchema() throws Exception {
        Optional<Path> dianXsd = findByTargetNamespace(STS_NAMESPACE);
        assumeTrue(dianXsd.isPresent(), "No XSD with the DIAN structures namespace in src/main/xsd");

        Document document = sampleDocument();
        Node extensions = document.getElementsByTagNameNS(STS_NAMESPACE, "DianExtensions").item(0);
        assertThat(extensions).as("sts:DianExtensions element").isNotNull();

        List<String> errors = withoutKnownCoId2Deviations(validate(dianXsd.get(), new DOMSource(extensions)));
        assertThat(errors).as("XSD errors in sts:DianExtensions").isEmpty();
    }

    /**
     * The annex 1.9 and the official examples of the DIAN toolbox put the check digit in schemeID and
     * "31" (NIT) in schemeName. The XSD restricts schemeID of coID2Type to document types, so the
     * examples themselves fail it. This pins the annex rule that the validation above tolerates.
     */
    @Test
    void providerIdsCarryTheCheckDigitAsInTheDianExamples() {
        Document document = sampleDocument();

        Element provider = (Element) document.getElementsByTagNameNS(STS_NAMESPACE, "ProviderID").item(0);
        assertThat(provider.getAttribute("schemeID")).isEqualTo("8");
        assertThat(provider.getAttribute("schemeName")).isEqualTo("31");

        Element dian = (Element) document.getElementsByTagNameNS(STS_NAMESPACE, "AuthorizationProviderID").item(0);
        assertThat(dian.getTextContent()).isEqualTo("800197268");
        assertThat(dian.getAttribute("schemeID")).isEqualTo("4");
        assertThat(dian.getAttribute("schemeName")).isEqualTo("31");
    }

    /**
     * Drops only the coID2Type schemeID errors raised by a single check digit on sts:ProviderID or
     * sts:AuthorizationProviderID (see providerIdsCarryTheCheckDigitAsInTheDianExamples). Xerces reports
     * each one as a cvc-attribute.3 error naming the element plus a cvc-enumeration-valid error with the
     * same value; any other error is kept.
     *
     * <p>Xerces translates the wording and reorders the arguments with the JVM locale (its locale
     * property has no effect here), so only the error code and the quoted arguments are checked.
     */
    private static List<String> withoutKnownCoId2Deviations(List<String> errors) {
        Set<String> checkDigits = new HashSet<>();
        List<String> kept = new ArrayList<>();
        for (String error : errors) {
            Optional<String> digit = quotedDigit(error);
            boolean providerId = error.contains("'sts:ProviderID'") || error.contains("'sts:AuthorizationProviderID'");
            if (error.startsWith("cvc-attribute.3") && providerId && error.contains("'schemeID'")
                    && error.contains("'#AnonType_schemeIDcoID2Type'") && digit.isPresent()) {
                checkDigits.add(digit.get());
            } else {
                kept.add(error);
            }
        }
        kept.removeIf(error -> error.startsWith("cvc-enumeration-valid")
                && error.contains("'[11, 12, 13, 21, 22, 31, 32, 41, 42, 50, 91]'")
                && quotedDigit(error).filter(checkDigits::contains).isPresent());
        return kept;
    }

    private static Optional<String> quotedDigit(String error) {
        Matcher matcher = QUOTED_DIGIT.matcher(error);
        return matcher.find() ? Optional.of(matcher.group(1)) : Optional.empty();
    }

    private static Document sampleDocument() {
        return new UblMarshaller().toDocument(new InvoiceUblMapper().map(InvoiceUblMapperTest.sampleInvoice()));
    }

    private static Document sampleCreditNoteDocument() {
        return new UblMarshaller().toDocument(new CreditNoteUblMapper().map(CreditNoteUblMapperTest.sampleCreditNote()));
    }

    private static List<String> validate(Path xsd, Source source) throws Exception {
        SchemaFactory factory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
        // Only local files: imports must resolve inside src/main/xsd, never over the network.
        factory.setProperty(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "file");
        factory.setProperty(XMLConstants.ACCESS_EXTERNAL_DTD, "file");
        Schema schema = factory.newSchema(xsd.toFile());

        Validator validator = schema.newValidator();
        List<String> errors = new ArrayList<>();
        validator.setErrorHandler(new ErrorHandler() {
            @Override
            public void warning(SAXParseException e) {
            }

            @Override
            public void error(SAXParseException e) {
                errors.add(format(e));
            }

            @Override
            public void fatalError(SAXParseException e) {
                errors.add(format(e));
            }
        });
        validator.validate(source);
        return errors;
    }

    private static String format(SAXParseException e) {
        return (e.getLineNumber() > 0 ? "line " + e.getLineNumber() + ": " : "") + e.getMessage();
    }

    private static Optional<Path> findByName(String fileName) throws IOException {
        if (!Files.isDirectory(XSD_ROOT)) {
            return Optional.empty();
        }
        try (Stream<Path> files = Files.walk(XSD_ROOT)) {
            return files.filter(path -> path.getFileName().toString().equals(fileName)).findFirst();
        }
    }

    private static Optional<Path> findByTargetNamespace(String namespace) throws IOException {
        if (!Files.isDirectory(XSD_ROOT)) {
            return Optional.empty();
        }
        try (Stream<Path> files = Files.walk(XSD_ROOT)) {
            return files.filter(path -> path.toString().endsWith(".xsd"))
                .filter(path -> declaresTargetNamespace(path, namespace))
                .findFirst();
        }
    }

    private static boolean declaresTargetNamespace(Path xsd, String namespace) {
        try {
            return Files.readString(xsd).contains("targetNamespace=\"" + namespace + "\"");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
