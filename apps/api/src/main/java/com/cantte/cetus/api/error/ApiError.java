package com.cantte.cetus.api.error;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

/** Error body returned by every endpoint. Codes are stable; messages are for humans. */
public record ApiError(@Schema(required = true) String code, @Schema(required = true) String message,
                       @Schema(required = true, nullable = true) List<String> details) {
}
