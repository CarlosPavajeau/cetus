// Job queue on Postgres: the API enqueues inside its transaction, the worker claims with SKIP LOCKED.
plugins {
    id("cetus.java-library")
}

dependencies {
    api(project(":modules:persistence"))
    implementation(enforcedPlatform(libs.quarkus.bom))
    api(libs.opentelemetry.api)

    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.assertj)
    testRuntimeOnly(libs.junit.launcher)
}
