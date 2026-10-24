package com.cantte.cetus.domain.model;

import com.cantte.cetus.domain.calc.CalculationResult;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** What credit and debit notes share to build their UBL: both correct an invoice and carry a CUDE. */
public sealed interface ElectronicNote permits ElectronicCreditNote, ElectronicDebitNote {

    Environment environment();

    String prefix();

    LocalDate issueDate();

    LocalTime issueTime();

    String currency();

    Party supplier();

    Party customer();

    PaymentInfo payment();

    CalculationResult calculation();

    BillingReference reference();

    CorrectionConcept concept();

    String correctionDescription();

    SoftwareInfo software();

    String cude();

    String qrCode();

    List<String> notes();

    String fullNumber();
}
