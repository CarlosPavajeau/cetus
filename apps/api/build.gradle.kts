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
    implementation(project(":modules:notifications"))
    implementation(project(":modules:aws"))
    implementation(project(":modules:cache"))
    // Only to verify the signature of Resend's delivery webhooks; the API never sends email.
    implementation(project(":modules:email"))
    // Only to validate uploaded certificates; the API never signs nor calls the DIAN.
    implementation(project(":modules:signing"))

    implementation(libs.quarkus.arc)
    implementation(libs.quarkus.rest)
    implementation(libs.quarkus.rest.jackson)
    implementation(libs.quarkus.hibernate.validator)
    implementation(libs.quarkus.flyway)
    implementation(libs.flyway.postgresql)
    implementation(libs.quarkus.smallrye.jwt)
    implementation(libs.quarkus.smallrye.openapi)
    implementation(libs.quarkus.smallrye.health)
    implementation(libs.quarkus.logging.json)
    implementation(libs.quarkus.micrometer.opentelemetry)

    testImplementation(libs.quarkus.junit)
    testImplementation(libs.quarkus.smallrye.jwt.build)
    testImplementation(libs.rest.assured)
    testImplementation(libs.assertj)
}
