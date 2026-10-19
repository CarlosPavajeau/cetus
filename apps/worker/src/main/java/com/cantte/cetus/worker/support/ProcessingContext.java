package com.cantte.cetus.worker.support;

import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.model.BillingReference;
import com.cantte.cetus.domain.model.CorrectionConcept;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.NumberingAuthorization;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PaymentInfo;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Detached snapshot of everything needed to process a document. Loaded in a short
 * transaction so no database connection is held while talking to KMS, S3 or the DIAN.
 */
public record ProcessingContext(
        UUID documentId,
        UUID issuerId,
        Environment environment,
        DocumentType documentType,
        String operationType,
        String prefix,
        long number,
        LocalDate issueDate,
        LocalTime issueTime,
        LocalDate dueDate,
        String currency,
        Party supplier,
        Party customer,
        PaymentInfo payment,
        List<String> notes,
        CalculationResult calculation,
        NumberingAuthorization authorization,
        BillingReference reference,
        CorrectionConcept correctionConcept,
        String correctionDescription,
        byte[] technicalKeySealed,
        String softwareId,
        byte[] pinSealed,
        String testSetId,
        CertificateRef certificate,
        String existingCufe,
        String trackId,
        boolean lastSendUnanswered,
        DocumentStatus status,
        OffsetDateTime validatedAt) {

    public String fullNumber() {
        return prefix + number;
    }

    public record CertificateRef(UUID id, String s3Key, byte[] passwordSealed) {
    }
}
