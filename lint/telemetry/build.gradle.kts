// Telemetry conventions the API and worker tests enforce on every meter they register.
plugins {
    id("cetus.java-library")
}

dependencies {
    implementation(enforcedPlatform(libs.quarkus.bom))
    api(libs.micrometer.core)

    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.assertj)
    testRuntimeOnly(libs.junit.launcher)
}
