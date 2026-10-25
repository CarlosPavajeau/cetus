// Hibernate ORM with Panache entities + Flyway migrations for the "billing" schema.
plugins {
    id("cetus.java-library")
}

dependencies {
    api(project(":modules:domain"))
    implementation(enforcedPlatform(libs.quarkus.bom))
    api(libs.quarkus.hibernate.orm.panache)
    api(libs.quarkus.jdbc.postgresql)
    api(libs.quarkus.jackson)
    // Names the enums that the API's OpenAPI spec shows; the annotations are read from the bytecode.
    compileOnly(enforcedPlatform(libs.quarkus.bom))
    compileOnly(libs.microprofile.openapi.api)

    // Migrations are verified against a real Postgres (Testcontainers, needs Docker).
    testImplementation(libs.flyway.core)
    testImplementation(libs.flyway.postgresql)
    testImplementation(libs.testcontainers.postgresql)
    testImplementation(libs.testcontainers.junit)
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.assertj)
    testRuntimeOnly(libs.junit.launcher)
}
