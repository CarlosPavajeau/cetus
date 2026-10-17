// AWS adapters: KMS envelope encryption for secrets and S3 for documents.
plugins {
    id("cetus.java-library")
}

dependencies {
    implementation(enforcedPlatform(libs.quarkus.bom))
    implementation(platform(libs.awssdk.bom))
    implementation(libs.quarkus.arc)
    api(libs.bundles.aws)
}
