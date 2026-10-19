package com.cantte.cetus.dian;

import java.util.List;
import java.util.Optional;

/**
 * GetNumberingRange: the ranges the DIAN authorized for an issuer and software.
 *
 * @param operationCode "100" when the query succeeded; anything else comes with a description of why not
 */
public record NumberingRangeResponse(String operationCode, String operationDescription, List<Range> ranges,
                                     String rawXml) {

    public boolean succeeded() {
        return "100".equals(operationCode);
    }

    /** The range with this prefix and, when given, this resolution number. */
    public Optional<Range> find(String prefix, String resolutionNumber) {
        String wanted = prefix == null ? "" : prefix;
        return ranges.stream()
                .filter(range -> wanted.equals(range.prefix() == null ? "" : range.prefix()))
                .filter(range -> resolutionNumber == null || resolutionNumber.equals(range.resolutionNumber()))
                .findFirst();
    }

    /** Dates come as the DIAN sends them (yyyy-MM-dd). */
    public record Range(String resolutionNumber, String resolutionDate, String prefix, Long fromNumber,
                        Long toNumber, String validDateFrom, String validDateTo, String technicalKey) {
    }
}
