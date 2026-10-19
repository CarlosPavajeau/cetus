plugins {
    id("cetus.java-conventions")
    id("io.quarkus")
}

dependencies {
    implementation(enforcedPlatform(libs.quarkus.bom))
    implementation(platform(libs.awssdk.bom))

    implementation(project(":modules:domain"))
    implementation(project(":modules:persistence"))
    implementation(project(":modules:jobs"))
    implementation(project(":modules:webhooks"))
    implementation(project(":modules:ubl"))
    implementation(project(":modules:signing"))
    implementation(project(":modules:dian-client"))
    implementation(project(":modules:aws"))
    implementation(project(":modules:email"))

    implementation(libs.quarkus.arc)
    implementation(libs.quarkus.scheduler)
    implementation(libs.quarkus.smallrye.health)
    // Graphic representation (PDF) and its QR code.
    implementation(libs.openpdf)
    implementation(libs.zxing.core)
    // Webhook deliveries: its pluggable DNS checks the very addresses it connects to (DNS rebinding).
    implementation(libs.okhttp)

    testImplementation(libs.quarkus.junit5)
    // The worker never migrates in production; tests create the schema the same way the API does.
    testImplementation(libs.quarkus.flyway)
    testImplementation(libs.flyway.postgresql)
    testImplementation(libs.assertj)
}
