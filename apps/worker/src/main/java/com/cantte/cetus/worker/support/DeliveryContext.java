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
import com.cantte.cetus.worker.support.ProcessingContext.CertificateRef;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record DeliveryContext(
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
        CertificateRef certificate,
        String existingCufe,
        DocumentStatus status,
        OffsetDateTime validatedAt)
        implements DeliverySnapshot {}
