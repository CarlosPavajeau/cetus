package com.cantte.cetus.persistence;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import io.quarkus.hibernate.orm.JsonFormat;
import io.quarkus.hibernate.orm.PersistenceUnitExtension;
import jakarta.enterprise.context.ApplicationScoped;
import org.hibernate.type.descriptor.WrapperOptions;
import org.hibernate.type.descriptor.java.JavaType;
import org.hibernate.type.format.FormatMapper;
import org.hibernate.type.format.jackson.JacksonJsonFormatMapper;

import java.io.IOException;

/**
 * How the JSON columns are written and read. Not the REST {@code ObjectMapper}: its customizations (SafeStrings)
 * are for requests. Dates stay ISO strings ({@code "dueDate": "2026-11-30"}), as stored before Quarkus 3.26;
 * Hibernate's own mapper would write {@code [2026, 11, 30]}.
 */
@JsonFormat
@PersistenceUnitExtension
@ApplicationScoped
public class JsonColumns implements FormatMapper {

    private final FormatMapper delegate = new JacksonJsonFormatMapper(JsonMapper.builder()
            .findAndAddModules()
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .disable(SerializationFeature.WRITE_DURATIONS_AS_TIMESTAMPS)
            // A row written before a field was removed must still load.
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build());

    @Override
    public <T> T fromString(CharSequence value, JavaType<T> type, WrapperOptions options) {
        return delegate.fromString(value, type, options);
    }

    @Override
    public <T> String toString(T value, JavaType<T> type, WrapperOptions options) {
        return delegate.toString(value, type, options);
    }

    @Override
    public boolean supportsSourceType(Class<?> sourceType) {
        return delegate.supportsSourceType(sourceType);
    }

    @Override
    public boolean supportsTargetType(Class<?> targetType) {
        return delegate.supportsTargetType(targetType);
    }

    @Override
    public <T> void writeToTarget(T value, JavaType<T> type, Object target, WrapperOptions options) throws IOException {
        delegate.writeToTarget(value, type, target, options);
    }

    @Override
    public <T> T readFromSource(JavaType<T> type, Object source, WrapperOptions options) throws IOException {
        return delegate.readFromSource(type, source, options);
    }
}
