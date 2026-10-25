package com.cantte.cetus.worker.handlers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cantte.cetus.aws.SecretCipher;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity.VerificationStatus;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.support.FakeDian;
import com.cantte.cetus.worker.support.FakeDian.Reply;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.function.Consumer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** GetNumberingRange against the range seeded by WorkerFixtures (the habilitación range SETP). */
@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
class VerifyNumberingRangeHandlerTest {

    private static final String OPERATION = "GetNumberingRange";

    @Inject
    VerifyNumberingRangeHandler handler;

    @Inject
    FakeDian dian;

    @Inject
    WorkerFixtures fixtures;

    @Inject
    SecretCipher cipher;

    @BeforeEach
    void reset() {
        dian.reset();
    }

    @Test
    void aRangeEqualToTheDiansIsVerified() {
        UUID rangeId = range(r -> {});
        dian.reply(OPERATION, Reply.fixture("get-numbering-range.xml"));

        handler.handle(job(rangeId));

        NumberingRangeEntity range = load(rangeId);
        assertThat(range.verificationStatus).isEqualTo(VerificationStatus.VERIFIED);
        assertThat(range.verificationError).isNull();
        assertThat(range.verifiedAt).isNotNull();
        String request = dian.calls().getFirst().body();
        assertThat(request)
                .contains("<wcf:accountCode>900123456</wcf:accountCode>")
                .contains("<wcf:accountCodeT>900123456</wcf:accountCodeT>")
                .contains("<wcf:softwareCode>");
    }

    @Test
    void aWrongTechnicalKeyIsAMismatchThatDoesNotRevealTheKeys() {
        UUID rangeId = range(r -> r.technicalKeySealed = cipher.sealText("0000000000000000000000000000000000000000"));
        dian.reply(OPERATION, Reply.fixture("get-numbering-range.xml"));

        handler.handle(job(rangeId));

        NumberingRangeEntity range = load(rangeId);
        assertThat(range.verificationStatus).isEqualTo(VerificationStatus.MISMATCH);
        assertThat(range.verificationError)
                .contains("clave técnica")
                .doesNotContain("fc8eac")
                .doesNotContain("00000000");
    }

    @Test
    void aRangeWithoutTechnicalKeyTakesTheDians() {
        UUID registered = range(r -> {});
        UUID rangeId = range(r -> r.technicalKeySealed = null);
        dian.reply(OPERATION, Reply.fixture("get-numbering-range.xml"));

        handler.handle(job(rangeId));

        NumberingRangeEntity range = load(rangeId);
        assertThat(range.verificationStatus).isEqualTo(VerificationStatus.VERIFIED);
        assertThat(cipher.openText(range.technicalKeySealed))
                .isEqualTo(cipher.openText(load(registered).technicalKeySealed));
    }

    @Test
    void aRangeWithoutTechnicalKeyTheDianDoesNotHaveKeepsItEmpty() {
        UUID rangeId = range(r -> {
            r.technicalKeySealed = null;
            r.prefix = "FE";
        });
        dian.reply(OPERATION, Reply.fixture("get-numbering-range.xml"));

        handler.handle(job(rangeId));

        NumberingRangeEntity range = load(rangeId);
        assertThat(range.verificationStatus).isEqualTo(VerificationStatus.MISMATCH);
        assertThat(range.technicalKeySealed).isNull();
    }

    @Test
    void differentNumbersAndAnUnknownPrefixAreMismatches() {
        UUID numbers = range(r -> r.rangeTo = 990000100);
        UUID prefix = range(r -> r.prefix = "FE");
        dian.reply(OPERATION, Reply.fixture("get-numbering-range.xml"), Reply.fixture("get-numbering-range.xml"));

        handler.handle(job(numbers));
        handler.handle(job(prefix));

        assertThat(load(numbers).verificationError).isEqualTo("hasta: Cetus 990000100, DIAN 995000000");
        assertThat(load(prefix).verificationStatus).isEqualTo(VerificationStatus.MISMATCH);
        assertThat(load(prefix).verificationError).contains("prefijo FE").contains("SETP (resolución 18760000001)");
    }

    @Test
    void aClientFaultGivesUpAndLeavesTheRangeInError() {
        UUID rangeId = range(r -> {});
        dian.reply(OPERATION, Reply.fault("fault-client.xml"));
        JobEntity job = job(rangeId);

        assertThatThrownBy(() -> handler.handle(job)).isInstanceOf(GiveUp.class);
        handler.onDead(job, "La DIAN rechazó la consulta");

        assertThat(load(rangeId).verificationStatus).isEqualTo(VerificationStatus.ERROR);
    }

    /** A copy of the seeded invoice range, changed by {@code change}, so tests do not share a range. */
    private UUID range(Consumer<NumberingRangeEntity> change) {
        UUID invoiceId = fixtures.invoice();
        return QuarkusTransaction.requiringNew().call(() -> {
            DocumentEntity invoice = DocumentEntity.findById(invoiceId);
            NumberingRangeEntity seeded = NumberingRangeEntity.findById(invoice.numberingRangeId);
            seeded.status = "DISABLED";
            NumberingRangeEntity range = new NumberingRangeEntity();
            range.id = Ids.newId();
            range.issuerId = seeded.issuerId;
            range.documentType = seeded.documentType;
            range.resolutionNumber = seeded.resolutionNumber;
            range.resolutionDate = seeded.resolutionDate;
            range.prefix = seeded.prefix;
            range.rangeFrom = seeded.rangeFrom;
            range.rangeTo = seeded.rangeTo;
            range.nextNumber = seeded.rangeFrom;
            range.validFrom = seeded.validFrom;
            range.validTo = seeded.validTo;
            range.technicalKeySealed = seeded.technicalKeySealed;
            range.verificationStatus = VerificationStatus.PENDING;
            change.accept(range);
            range.persist();
            return range.id;
        });
    }

    private static JobEntity job(UUID rangeId) {
        JobEntity job = new JobEntity();
        job.id = Ids.newId();
        job.jobType = JobTypes.VERIFY_NUMBERING_RANGE;
        job.referenceId = rangeId;
        job.attempts = 1;
        job.runAt = OffsetDateTime.now();
        return job;
    }

    private static NumberingRangeEntity load(UUID rangeId) {
        return QuarkusTransaction.requiringNew().call(() -> NumberingRangeEntity.findById(rangeId));
    }
}
