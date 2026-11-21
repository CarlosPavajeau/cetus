package com.cantte.cetus.lint.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.properties.HasAnnotations;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.junit.jupiter.api.Test;

class OpenApiSchemaTest {

    @Test
    void noMemberIsMarkedRequired() {
        classes()
                .should(new ArchCondition<JavaClass>("not mark anything @Schema(required = true)") {
                    @Override
                    public void check(JavaClass type, ConditionEvents events) {
                        annotated(type)
                                .filter(OpenApiSchemaTest::markedRequired)
                                .forEach(element -> events.add(SimpleConditionEvent.violated(
                                        type, element + " is marked @Schema(required = true)")));
                    }
                })
                .because("OpenApiFilter marks every member of a response required, and requests take it from Bean"
                        + " Validation; a member that can be null takes @Schema(nullable = true)")
                .check(CetusClasses.MAIN);
    }

    private static Stream<HasAnnotations<?>> annotated(JavaClass type) {
        List<HasAnnotations<?>> elements = new ArrayList<>();
        elements.add(type);
        elements.addAll(type.getFields());
        type.getCodeUnits().forEach(codeUnit -> {
            elements.add(codeUnit);
            elements.addAll(codeUnit.getParameters());
        });
        return elements.stream();
    }

    private static boolean markedRequired(HasAnnotations<?> element) {
        return element.tryGetAnnotationOfType(Schema.class.getName())
                .flatMap(schema -> schema.get("required"))
                .map(Boolean.TRUE::equals)
                .orElse(false);
    }
}
