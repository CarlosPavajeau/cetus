// UBL 2.1 model (hand-written JAXB, English names, only what the DIAN uses) + mappers.
plugins {
    id("cetus.java-library")
}

dependencies {
    api(project(":modules:domain"))
    implementation(enforcedPlatform(libs.quarkus.bom))
    api(libs.quarkus.jaxb)

    testImplementation(project(":modules:signing"))
    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.assertj)
    testRuntimeOnly(libs.junit.launcher)
}
