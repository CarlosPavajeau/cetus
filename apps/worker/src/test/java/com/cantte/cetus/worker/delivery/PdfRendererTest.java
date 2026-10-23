package com.cantte.cetus.worker.delivery;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.BillingReference;
import com.cantte.cetus.domain.model.CorrectionConcept;
import com.cantte.cetus.domain.model.CreditNoteConcept;
import com.cantte.cetus.domain.model.DebitNoteConcept;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.NumberingAuthorization;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PaymentInfo;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.worker.support.ProcessingContext;
import com.cantte.cetus.worker.support.WorkerFixtures;
import org.junit.jupiter.api.Test;
import org.openpdf.text.pdf.PdfReader;
import org.openpdf.text.pdf.parser.PdfTextExtractor;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PdfRendererTest {

    private static final Path OUTPUT = Path.of("build/pdf");
    private static final String CUFE = "a".repeat(96);
    private static final PdfRenderer.Legend LEGEND = new PdfRenderer.Legend("Cetus", "Cetus Pruebas SAS", "900123456");
    private static final Address ADDRESS = new Address("11001", "Bogotá, D.C.", "11", "Bogotá", "110111",
            "Calle 100 # 10-20", "CO", "Colombia");

    @Test
    void anInvoiceCarriesItsPartiesTotalsResolutionAndCufe() throws IOException {
        byte[] pdf = new PdfRenderer().render(context(DocumentType.INVOICE, "SETP", 990000001, null), CUFE, LEGEND);
        write("sample-invoice.pdf", pdf);

        assertThat(new String(pdf, 0, 5)).isEqualTo("%PDF-");
        String text = text(pdf);
        assertThat(text)
                .contains("FACTURA ELECTRÓNICA DE VENTA", "No. SETP990000001")
                .contains("Cetus Pruebas SAS", "NIT 900123456-8", "Responsabilidades fiscales: O-13")
                .contains("OPTICAS GMO COLOMBIA S A S", "NIT 900108281-3")
                .contains("Servicio de consultoría", "Libro")
                .contains("Total a pagar", "$ 119.105,00")
                .contains("Autorización de numeración de facturación DIAN No. 18760000001")
                .contains("CUFE:", CUFE)
                .contains("Validada por la DIAN el 2026-10-18 21:05:09-05:00")
                .contains("Software: Cetus · Proveedor tecnológico: Cetus Pruebas SAS NIT 900123456");
    }

    @Test
    void aCreditNoteShowsTheInvoiceItCorrectsAndNoResolution() throws IOException {
        BillingReference reference = new BillingReference("SETP990000001", "b".repeat(96), LocalDate.of(2026, 10, 17));
        byte[] pdf = new PdfRenderer().render(context(DocumentType.CREDIT_NOTE, "NC", 1, reference), CUFE, LEGEND);
        write("sample-credit-note.pdf", pdf);

        String text = text(pdf);
        assertThat(text)
                .contains("NOTA CRÉDITO ELECTRÓNICA", "No. NC1")
                .contains("FACTURA QUE SE CORRIGE", "SETP990000001", "b".repeat(96))
                .contains("2 - Anulación de factura electrónica", "Anulación por error en el valor")
                .contains("Total nota", "CUDE:")
                .doesNotContain("Autorización de numeración");
    }

    @Test
    void aDebitNoteShowsTheInvoiceItAddsToAndItsConcept() throws IOException {
        BillingReference reference = new BillingReference("SETP990000001", "b".repeat(96), LocalDate.of(2026, 10, 17));
        byte[] pdf = new PdfRenderer().render(context(DocumentType.DEBIT_NOTE, "ND", 1, reference), CUFE, LEGEND);
        write("sample-debit-note.pdf", pdf);

        String text = text(pdf);
        assertThat(text)
                .contains("NOTA DÉBITO ELECTRÓNICA", "No. ND1")
                .contains("SETP990000001", "b".repeat(96))
                .contains("1 - Intereses", "Intereses de mora")
                .contains("Total nota", "CUDE:")
                .doesNotContain("Autorización de numeración");
    }

    @Test
    void documentsWithoutFiscalValueSaySoOnEveryPage() throws IOException {
        byte[] sandbox = new PdfRenderer().render(context(Environment.SANDBOX, DocumentType.INVOICE, "SIM", 1, null),
                CUFE, LEGEND);
        write("sample-sandbox-invoice.pdf", sandbox);
        byte[] test = new PdfRenderer().render(context(DocumentType.INVOICE, "SETP", 990000001, null), CUFE, LEGEND);
        byte[] live = new PdfRenderer().render(context(Environment.LIVE, DocumentType.INVOICE, "FE", 1, null),
                CUFE, LEGEND);

        assertThat(text(sandbox)).contains("Documento simulado, sin validez fiscal",
                        "Validación simulada por Cetus el", "no fue enviado a la DIAN")
                .doesNotContain("Validada por la DIAN");
        assertThat(text(test)).contains("Documento de pruebas, sin validez fiscal");
        assertThat(text(live)).doesNotContain("sin validez fiscal");
    }

    /** Kept in build/pdf/ to look at the template when changing it. */
    private static void write(String name, byte[] pdf) throws IOException {
        Files.createDirectories(OUTPUT);
        Files.write(OUTPUT.resolve(name), pdf);
    }

    /** Text as a viewer would copy it; long values wrap, so line breaks are dropped. */
    private static String text(byte[] pdf) throws IOException {
        PdfReader reader = new PdfReader(pdf);
        PdfTextExtractor extractor = new PdfTextExtractor(reader);
        StringBuilder text = new StringBuilder();
        for (int page = 1; page <= reader.getNumberOfPages(); page++) {
            text.append(extractor.getTextFromPage(page)).append('\n');
        }
        return text.toString().replace("\n", "");
    }

    private static ProcessingContext context(DocumentType type, String prefix, long number, BillingReference reference) {
        return context(Environment.TEST, type, prefix, number, reference);
    }

    private static ProcessingContext context(Environment environment, DocumentType type, String prefix, long number,
                                             BillingReference reference) {
        Party supplier = new Party(PersonType.LEGAL_ENTITY, IdentificationType.NIT, "900123456", "8",
                "Cetus Pruebas SAS", null, List.of("O-13"), "01", "IVA", ADDRESS, "facturas@cetus.test", "3001234567");
        Party customer = new Party(PersonType.LEGAL_ENTITY, IdentificationType.NIT, "900108281", "3",
                "OPTICAS GMO COLOMBIA S A S", null, List.of("R-99-PN"), "01", "IVA", ADDRESS, "compras@example.com", null);
        boolean note = type != DocumentType.INVOICE;
        CorrectionConcept concept = switch (type) {
            case INVOICE -> null;
            case CREDIT_NOTE -> CreditNoteConcept.CANCELLATION;
            case DEBIT_NOTE -> DebitNoteConcept.INTEREST;
        };
        String reason = switch (type) {
            case INVOICE -> null;
            case CREDIT_NOTE -> "Anulación por error en el valor";
            case DEBIT_NOTE -> "Intereses de mora";
        };
        return new ProcessingContext(Ids.newId(), Ids.newId(), environment, type, "10", prefix, number,
                LocalDate.of(2026, 10, 18), LocalTime.of(10, 30), null, "COP", supplier, customer,
                new PaymentInfo("1", "10", null), List.of(), WorkerFixtures.calculation(),
                note ? null : new NumberingAuthorization("18760000001", LocalDate.of(2019, 1, 19), LocalDate.of(2030, 1, 19),
                        "SETP", 990000000, 995000000),
                reference, concept, reason,
                null, "software-id", null, null, null, CUFE, null, false, DocumentStatus.ACCEPTED,
                OffsetDateTime.of(2026, 10, 19, 2, 5, 9, 0, ZoneOffset.UTC));
    }
}
