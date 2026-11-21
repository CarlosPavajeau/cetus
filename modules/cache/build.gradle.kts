// Caches behind one interface: in memory today, and a shared store (Redis or Valkey) for several replicas later.
plugins {
    id("cetus.java-library")
}

dependencies {
    implementation(enforcedPlatform(libs.quarkus.bom))
    implementation(libs.quarkus.arc)
    implementation(libs.quarkus.scheduler)
    implementation(libs.micrometer.core)

    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.assertj)
    testImplementation(project(":lint:telemetry"))
    testRuntimeOnly(libs.junit.launcher)
}
