// Credits: lots granted by purchases, promotions and adjustments, reserved by LIVE documents first expiring
// first, and the product and production issuers the lots give an account. Knows nothing of orders or payments.
plugins {
    id("cetus.java-library")
}

dependencies {
    api(project(":modules:persistence"))
    implementation(enforcedPlatform(libs.quarkus.bom))
}
