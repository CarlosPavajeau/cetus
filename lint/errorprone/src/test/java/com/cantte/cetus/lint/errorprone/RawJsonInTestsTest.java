package com.cantte.cetus.lint.errorprone;

import com.google.errorprone.CompilationTestHelper;
import org.junit.jupiter.api.Test;

class RawJsonInTestsTest {

    private final CompilationTestHelper compilation =
            CompilationTestHelper.newInstance(RawJsonInTests.class, getClass());

    @Test
    void flagsJsonObjectsAndArrays() {
        compilation
                .addSourceLines(
                        "Sample.java",
                        "class Sample {",
                        "  // BUG: Diagnostic contains: RawJsonInTests",
                        "  String object = \"{\\\"name\\\": \\\"Ana\\\"}\";",
                        "  // BUG: Diagnostic contains: RawJsonInTests",
                        "  String array = \"[{\\\"id\\\": 1}]\";",
                        "  // BUG: Diagnostic contains: RawJsonInTests",
                        "  String numbers = \"[1, 2]\";",
                        "  // BUG: Diagnostic contains: RawJsonInTests",
                        "  String booleans = \"[true, false]\";",
                        "  // BUG: Diagnostic contains: RawJsonInTests",
                        "  String nested = \"[[1, 2]]\";",
                        "  // BUG: Diagnostic contains: RawJsonInTests",
                        "  String decimals = \"[-1.5, 2]\";",
                        "  // BUG: Diagnostic contains: RawJsonInTests",
                        "  String block = \"\"\"",
                        "      {",
                        "        \"name\": \"Ana\"",
                        "      }",
                        "      \"\"\";",
                        "}")
                .doTest();
    }

    @Test
    void leavesOtherStringsAlone() {
        compilation
                .addSourceLines(
                        "Sample.java",
                        "class Sample {",
                        "  String placeholder = \"{}\";",
                        "  String none = \"[]\";",
                        "  String path = \"items[0].id\";",
                        "  String index = \"[0]\";",
                        "  String label = \"[draft] Factura\";",
                        "  String template = \"{0} documents\";",
                        "  String text = \"Factura {numero}\";",
                        "}")
                .doTest();
    }
}
