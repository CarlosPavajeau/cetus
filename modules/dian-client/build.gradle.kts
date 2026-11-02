// SOAP client for the DIAN web services: explicit envelope + WS-Security, JDK HttpClient.
plugins {
    id("cetus.java-library")
}

dependencies {
    api(project(":modules:signing"))
    implementation(project(":modules:domain"))

    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.assertj)
    testRuntimeOnly(libs.junit.launcher)
}
