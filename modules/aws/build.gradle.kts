// AWS adapters: KMS envelope encryption for secrets and S3 for documents.
plugins {
    id("cetus.java-library")
}

dependencies {
    implementation(enforcedPlatform(libs.quarkus.bom))
    implementation(platform(libs.awssdk.bom))
    implementation(libs.quarkus.arc)
    api(libs.bundles.aws)

    // Object Lock is checked against a real S3 API (LocalStack), not a fake.
    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.assertj)
    testImplementation(libs.testcontainers.junit)
    testImplementation(libs.testcontainers.localstack)
    testRuntimeOnly(libs.junit.launcher)
}
