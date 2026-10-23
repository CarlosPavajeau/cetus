// Notices to an account's contacts: what each kind reports and to which category, and the request that
// records one and enqueues its email in the caller's transaction. The worker renders and sends them.
plugins {
    id("cetus.java-library")
}

dependencies {
    api(project(":modules:jobs"))
    implementation(enforcedPlatform(libs.quarkus.bom))
}
