// Job queue on Postgres: the API enqueues inside its transaction, the worker claims with SKIP LOCKED.
plugins {
    id("cetus.java-library")
}

dependencies {
    api(project(":modules:persistence"))
    implementation(enforcedPlatform(libs.quarkus.bom))
}
