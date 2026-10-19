// Outbound webhooks: the events integrators receive, how they are signed (Standard Webhooks) and the
// publisher that records them and enqueues their delivery in the caller's transaction.
plugins {
    id("cetus.java-library")
}

dependencies {
    api(project(":modules:jobs"))
    implementation(enforcedPlatform(libs.quarkus.bom))

    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.assertj)
    testRuntimeOnly(libs.junit.launcher)
    // Svix (Resend) uses the same scheme: its verifier proves our signatures interoperate.
    testImplementation(project(":modules:email"))
}
