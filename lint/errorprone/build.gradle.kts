// Error Prone checks of our own; cetus.java-conventions runs them on every compilation.
plugins {
    id("cetus.java-library")
}

dependencies {
    compileOnly(libs.errorprone.check.api)

    testImplementation(libs.errorprone.check.api)
    testImplementation(libs.errorprone.test.helpers)
    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.launcher)
}

// Checks see javac's internals, which --release hides; the toolchain still compiles for Java 25.
val javacExports = listOf("api", "code", "comp", "file", "main", "model", "parser", "processing", "tree", "util")
    .map { "--add-exports=jdk.compiler/com.sun.tools.javac.$it=ALL-UNNAMED" }

tasks.withType<JavaCompile>().configureEach {
    options.release.set(null as Int?)
    options.compilerArgs.addAll(javacExports)
}

tasks.test {
    jvmArgs(javacExports + "--add-opens=jdk.compiler/com.sun.tools.javac.code=ALL-UNNAMED")
}
