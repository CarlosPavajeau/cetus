package com.cantte.cetus.dian;

import java.util.List;

/** Result of SendTestSetAsync: the ZipKey is used later with GetStatusZip. */
public record UploadResponse(String zipKey, List<String> errors, String rawXml) {
}
