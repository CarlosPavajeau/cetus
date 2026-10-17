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
    implementation(project(":modules:ubl"))
    implementation(project(":modules:signing"))
    implementation(project(":modules:dian-client"))
    implementation(project(":modules:aws"))

    implementation(libs.quarkus.arc)
    implementation(libs.quarkus.scheduler)
    implementation(libs.quarkus.smallrye.health)

    testImplementation(libs.quarkus.junit5)
}
