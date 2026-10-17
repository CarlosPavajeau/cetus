// Shared settings for every Java project in the repo.
plugins {
    java
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
    options.release = 21
    // Keeps parameter names for Jackson, JAX-RS and records.
    options.compilerArgs.add("-parameters")
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
    systemProperty("user.timezone", "America/Bogota")
    // Testcontainers (and Quarkus Dev Services) default to Docker API 1.32, which Docker Engine 29+
    // answers with an empty /info. 1.44 = Docker 25+.
    systemProperty("api.version", "1.44")
}
