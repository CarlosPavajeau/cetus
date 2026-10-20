package com.cantte.cetus.api.json;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.deser.std.StdScalarDeserializer;
import com.fasterxml.jackson.databind.deser.std.StringDeserializer;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.fasterxml.jackson.databind.module.SimpleModule;
import io.quarkus.jackson.ObjectMapperCustomizer;
import jakarta.inject.Singleton;

import java.io.IOException;

/**
 * Every string the API reads must fit in an XML 1.0 document: the documents carry them verbatim, and a
 * control character would make the DIAN reject an XML that already took its consecutive number (and
 * Postgres refuses \u0000 in JSONB). Bidirectional overrides are refused too, since they make the text
 * on the PDF or the email read differently from what was sent.
 */
@Singleton
public class SafeStrings implements ObjectMapperCustomizer {

    @Override
    public void customize(ObjectMapper mapper) {
        mapper.registerModule(new SimpleModule("safe-strings").addDeserializer(String.class, new Deserializer()));
    }

    static boolean allowed(int codePoint) {
        boolean xml = codePoint == '\t' || codePoint == '\n' || codePoint == '\r'
                || (codePoint >= 0x20 && codePoint <= 0xD7FF)
                || (codePoint >= 0xE000 && codePoint <= 0xFFFD)
                || (codePoint >= 0x10000 && codePoint <= 0x10FFFF);
        boolean bidiControl = (codePoint >= 0x202A && codePoint <= 0x202E)
                || (codePoint >= 0x2066 && codePoint <= 0x2069);
        return xml && !bidiControl;
    }

    static final class Deserializer extends StdScalarDeserializer<String> {

        Deserializer() {
            super(String.class);
        }

        @Override
        public String deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            String value = StringDeserializer.instance.deserialize(parser, context);
            if (value != null && !value.codePoints().allMatch(SafeStrings::allowed)) {
                // The value itself is left out of the message: it holds the characters being refused.
                throw InvalidFormatException.from(parser,
                        "Text cannot contain control characters or bidirectional overrides", null, String.class);
            }
            return value;
        }
    }
}
