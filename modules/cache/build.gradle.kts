// Caches behind one interface: in memory today, and a shared store (Redis or Valkey) for several replicas later.
plugins {
    id("cetus.java-library")
}

dependencies {
    implementation(enforcedPlatform(libs.quarkus.bom))
    implementation(libs.quarkus.arc)
    implementation(libs.quarkus.scheduler)

    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.assertj)
    testRuntimeOnly(libs.junit.launcher)
}
