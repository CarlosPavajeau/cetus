package com.cantte.cetus.api.error;

import java.util.List;

/** Error body returned by every endpoint. Codes are stable; messages are for humans. */
public record ApiError(String code, String message, List<String> details) {
}
