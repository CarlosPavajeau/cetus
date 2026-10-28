package com.cantte.cetus.worker.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ContextLoaderTest {
    @Inject
    ContextLoader loader;

    @Inject
    WorkerFixtures fixtures;

    @Inject
    EntityManagerFactory factory;

    @Test
    void deliveryDoesNotRequireProcessingCredentials() {
        var id = fixtures.invoice();
        var original = loader.load(id).orElseThrow();
        QuarkusTransaction.requiringNew().run(() -> {
            com.cantte.cetus.persistence.entity.SoftwareCredentialEntity.delete("issuerId", original.issuerId());
        });
        assertThat(loader.loadDelivery(id).orElseThrow().calculation()).isEqualTo(original.calculation());
    }

    @Test
    void preservesNotesReferencesAndAllEnvironments() {
        var invoice = fixtures.invoice();
        for (var id : java.util.List.of(
                invoice,
                fixtures.creditNote(invoice),
                fixtures.debitNote(invoice),
                fixtures.sandboxInvoice("900108281"))) {
            var processing = loader.load(id).orElseThrow();
            var delivery = loader.loadDelivery(id).orElseThrow();
            assertThat(delivery.calculation()).isEqualTo(processing.calculation());
            assertThat(delivery.reference()).isEqualTo(processing.reference());
            assertThat(delivery.correctionConcept()).isEqualTo(processing.correctionConcept());
            assertThat(delivery.notes()).isEqualTo(processing.notes());
            if (processing.environment() != Environment.SANDBOX) {
                QuarkusTransaction.requiringNew()
                        .run(() -> DocumentEntity.<DocumentEntity>findById(id).environment = Environment.LIVE);
                assertThat(loader.loadDelivery(id).orElseThrow().calculation()).isEqualTo(delivery.calculation());
                assertThat(loader.load(id).orElseThrow().calculation()).isEqualTo(processing.calculation());
            }
        }
    }

    @Test
    void queryCountIsIndependentOfLineCount() {
        var stats = factory.unwrap(SessionFactory.class).getStatistics();
        stats.setStatisticsEnabled(true);
        try {
            for (int count : new int[] {2, 100, 500}) {
                var id = fixtures.invoice();
                QuarkusTransaction.requiringNew().run(() -> {
                    DocumentEntity doc = DocumentEntity.findById(id);
                    var template = doc.lines.getFirst();
                    for (int i = doc.lines.size(); i < count; i++) {
                        var line = new com.cantte.cetus.persistence.entity.DocumentLineEntity();
                        line.id = java.util.UUID.randomUUID();
                        line.document = doc;
                        line.lineNumber = i + 1;
                        line.description = "Additional line";
                        line.quantity = template.quantity;
                        line.unitCode = template.unitCode;
                        line.unitPrice = template.unitPrice;
                        line.lineExtensionAmount = template.lineExtensionAmount;
                        line.persist();
                        var tax = new com.cantte.cetus.persistence.entity.DocumentTaxEntity();
                        tax.id = java.util.UUID.randomUUID();
                        tax.document = doc;
                        tax.line = line;
                        tax.taxType = com.cantte.cetus.domain.model.TaxType.IVA;
                        tax.percent = java.math.BigDecimal.valueOf(19);
                        tax.taxableAmount = line.lineExtensionAmount;
                        tax.taxAmount = java.math.BigDecimal.ONE;
                        tax.persist();
                    }
                });
                stats.clear();
                var processing = loader.load(id).orElseThrow();
                assertThat(processing.calculation().lines()).hasSize(count);
                assertThat(stats.getPrepareStatementCount()).isEqualTo(5);
                stats.clear();
                var delivery = loader.loadDelivery(id).orElseThrow();
                assertThat(delivery.calculation()).isEqualTo(processing.calculation());
                assertThat(stats.getPrepareStatementCount()).isEqualTo(4);
            }
        } finally {
            stats.setStatisticsEnabled(false);
        }
    }

    @Test
    void measuresDetachedContextQueries() {
        var id = fixtures.invoice();
        var stats = factory.unwrap(SessionFactory.class).getStatistics();
        stats.setStatisticsEnabled(true);
        try {
            stats.clear();
            var ctx = loader.load(id).orElseThrow();
            long queries = stats.getPrepareStatementCount();
            assertThat(ctx.calculation().lines()).isNotEmpty();
            assertThat(queries).isEqualTo(5);
            stats.clear();
            var delivery = loader.loadDelivery(id).orElseThrow();
            long deliveryQueries = stats.getPrepareStatementCount();
            assertThat(delivery.calculation()).isEqualTo(ctx.calculation());
            assertThat(delivery.supplier()).isEqualTo(ctx.supplier());
            assertThat(delivery.authorization()).isEqualTo(ctx.authorization());
            assertThat(deliveryQueries).isEqualTo(4);
            System.out.println("CONTEXT_QUERIES processing=" + queries + " delivery=" + deliveryQueries);
        } finally {
            stats.setStatisticsEnabled(false);
        }
    }
}
