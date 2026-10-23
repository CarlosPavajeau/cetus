// Local stand-in for the DIAN web services (IWcfDianCustomerServices). Development only, never deployed.
plugins {
    id("cetus.java-conventions")
    application
}

dependencies {
    implementation(project(":modules:signing"))
    implementation(project(":modules:dian-client"))

    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.assertj)
    testRuntimeOnly(libs.junit.launcher)
}

// The test certificate signs the mock's ApplicationResponses. Packaged in the jar so installDist (bench) runs anywhere.
tasks.processResources {
    from("src/test/resources/test-signer.p12") { into("signer") }
}

application {
    mainClass = "com.cantte.cetus.dianmock.DianMockServer"
}
