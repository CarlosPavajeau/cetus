// Outbound email behind EmailSender, so the provider (Resend) stays out of the apps.
plugins {
    id("cetus.java-library")
}

dependencies {
    implementation(libs.resend.java)

    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.assertj)
    testRuntimeOnly(libs.junit.launcher)
}
