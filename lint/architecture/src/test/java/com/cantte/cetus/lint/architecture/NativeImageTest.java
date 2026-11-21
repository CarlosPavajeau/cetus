package com.cantte.cetus.lint.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaField;
import com.tngtech.archunit.core.domain.JavaModifier;
import com.tngtech.archunit.core.domain.Source;
import io.quarkus.runtime.annotations.RegisterForReflection;
import java.io.IOException;
import java.io.Reader;
import java.lang.reflect.Field;
import java.lang.reflect.GenericArrayType;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Properties;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.junit.jupiter.api.Test;

/** The API ships as a native binary; these are the mistakes the JVM test suite cannot see. */
class NativeImageTest {

    private static final String RUNTIME_INIT = "--initialize-at-run-time=";
    private static final Pattern ARGS_SEPARATOR = Pattern.compile("(?<!\\\\),");
    private static final String JSON_COLUMN_TYPES = "com.cantte.cetus.api.json.JsonColumnTypes";

    @Test
    void staticSecureRandomsOfTheApiInitializeAtRunTime() throws IOException {
        var apiClasspath = apiClasspath();
        var runtimeInit = runtimeInit();

        var classesMissing = CetusClasses.MAIN.stream()
                .filter(type -> onClasspath(type, apiClasspath))
                .filter(NativeImageTest::holdsStaticSecureRandom)
                .map(JavaClass::getName)
                .filter(name -> runtimeInit.stream().noneMatch(entry -> covers(entry, name)))
                .sorted()
                .toList();

        assertThat(classesMissing)
                .as("A SecureRandom in a static field would be seeded at build time and baked into the native"
                        + " binary. Add these classes to --initialize-at-run-time in"
                        + " quarkus.native.additional-build-args (apps/api application.properties)")
                .isEmpty();
    }

    @Test
    void jsonColumnTypesAreRegisteredForReflection() throws ClassNotFoundException {
        var registered = Arrays.stream(Class.forName(JSON_COLUMN_TYPES)
                        .getAnnotation(RegisterForReflection.class)
                        .targets())
                .map(Class::getName)
                .collect(Collectors.toSet());

        var typesMissing = jsonColumnTypes().stream()
                .filter(name -> !registered.contains(name))
                .toList();

        assertThat(typesMissing)
                .as("Jackson reads JSON columns by reflection, which the native binary only allows for registered"
                        + " classes. Add these types to " + JSON_COLUMN_TYPES)
                .isEmpty();
    }

    private static boolean holdsStaticSecureRandom(JavaClass type) {
        return type.getFields().stream()
                .filter(field -> field.getModifiers().contains(JavaModifier.STATIC))
                .map(JavaField::getRawType)
                .anyMatch(fieldType -> fieldType.isAssignableTo(SecureRandom.class));
    }

    private static boolean covers(String entry, String className) {
        return className.equals(entry) || className.startsWith(entry + ".");
    }

    private static Set<String> runtimeInit() throws IOException {
        var properties = new Properties();
        try (Reader reader = Files.newBufferedReader(Path.of(System.getProperty("cetus.api.properties")))) {
            properties.load(reader);
        }
        var args = properties.getProperty("quarkus.native.additional-build-args", "");
        return ARGS_SEPARATOR
                .splitAsStream(args)
                .filter(arg -> arg.startsWith(RUNTIME_INIT))
                .flatMap(arg ->
                        Arrays.stream(arg.substring(RUNTIME_INIT.length()).split("\\\\,")))
                .map(String::strip)
                .collect(Collectors.toSet());
    }

    private static Set<Path> apiClasspath() {
        return Arrays.stream(System.getProperty("cetus.api.classpath").split(java.io.File.pathSeparator))
                .map(entry -> Path.of(entry).toAbsolutePath().normalize())
                .collect(Collectors.toSet());
    }

    private static boolean onClasspath(JavaClass type, Set<Path> classpath) {
        var uri = type.getSource().map(Source::getUri).orElseThrow();
        if (!"jar".equals(uri.getScheme())) {
            throw new IllegalStateException("Expected " + type.getName() + " to come from a jar, not " + uri);
        }
        var spec = uri.getSchemeSpecificPart();
        var jar = Path.of(URI.create(spec.substring(0, spec.indexOf("!/"))));
        return classpath.contains(jar.toAbsolutePath().normalize());
    }

    private static Set<String> jsonColumnTypes() {
        var pending = new ArrayDeque<Type>();
        CetusClasses.MAIN.stream()
                .flatMap(type -> type.getFields().stream())
                .filter(NativeImageTest::isJsonColumn)
                .map(JavaField::reflect)
                .map(Field::getGenericType)
                .forEach(pending::add);

        var seen = new HashSet<Class<?>>();
        var types = new TreeSet<String>();
        while (!pending.isEmpty()) {
            for (var type : classesOf(pending.removeFirst())) {
                if (!type.getName().startsWith("com.cantte.cetus.") || type.isEnum() || !seen.add(type)) {
                    continue;
                }
                types.add(type.getName());
                Arrays.stream(type.getDeclaredFields())
                        .filter(field -> !java.lang.reflect.Modifier.isStatic(field.getModifiers()))
                        .map(Field::getGenericType)
                        .forEach(pending::add);
            }
        }
        return types;
    }

    private static boolean isJsonColumn(JavaField field) {
        return field.tryGetAnnotationOfType(JdbcTypeCode.class)
                .map(code -> code.value() == SqlTypes.JSON)
                .orElse(false);
    }

    private static List<Class<?>> classesOf(Type type) {
        return switch (type) {
            case Class<?> raw when raw.isArray() -> classesOf(raw.getComponentType());
            case Class<?> raw -> List.of(raw);
            case ParameterizedType parameterized ->
                Arrays.stream(parameterized.getActualTypeArguments())
                        .flatMap(argument -> classesOf(argument).stream())
                        .collect(Collectors.collectingAndThen(Collectors.toList(), arguments -> {
                            arguments.addAll(classesOf(parameterized.getRawType()));
                            return arguments;
                        }));
            case GenericArrayType array -> classesOf(array.getGenericComponentType());
            default -> throw new IllegalStateException("A JSON column holds a type this rule cannot read: " + type);
        };
    }
}
