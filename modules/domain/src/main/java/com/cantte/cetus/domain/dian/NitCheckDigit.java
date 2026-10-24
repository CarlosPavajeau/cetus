package com.cantte.cetus.domain.dian;

/** Verification digit (DV) of a Colombian NIT, modulus 11 algorithm. */
public final class NitCheckDigit {

    private static final int[] WEIGHTS = {3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71};

    private NitCheckDigit() {}

    public static String compute(String nit) {
        if (nit == null || !nit.matches("\\d{1,15}")) {
            throw new IllegalArgumentException("NIT must contain only digits");
        }
        int sum = 0;
        for (int i = 0; i < nit.length(); i++) {
            int digit = nit.charAt(nit.length() - 1 - i) - '0';
            sum += digit * WEIGHTS[i];
        }
        int remainder = sum % 11;
        return String.valueOf(remainder > 1 ? 11 - remainder : remainder);
    }

    public static boolean isValid(String nit, String checkDigit) {
        return compute(nit).equals(checkDigit);
    }
}
