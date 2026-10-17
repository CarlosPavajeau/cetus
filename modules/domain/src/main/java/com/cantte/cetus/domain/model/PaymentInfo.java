package com.cantte.cetus.domain.model;

import java.time.LocalDate;

/**
 * @param methodId  1 = cash payment (contado), 2 = credit
 * @param meansCode DIAN payment means code (10 cash, 42 bank transfer, 48 credit card...)
 * @param dueDate   required when methodId is 2
 */
public record PaymentInfo(String methodId, String meansCode, LocalDate dueDate) {
}
