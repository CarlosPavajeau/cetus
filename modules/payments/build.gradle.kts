// Payment gateway behind PaymentGateway, so the provider (Wompi) stays out of the apps. Wompi has no Java
// SDK: its REST API is called with the JDK HttpClient.
plugins {
    id("cetus.java-library")
}

dependencies {
    implementation(enforcedPlatform(libs.quarkus.bom))
    implementation(libs.jackson.databind)

    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.assertj)
    testRuntimeOnly(libs.junit.launcher)
}
