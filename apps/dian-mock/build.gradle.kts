// Local stand-in for the DIAN web services (IWcfDianCustomerServices). Development only, never deployed.
plugins {
    id("cetus.java-conventions")
    application
}

dependencies {
    implementation(project(":modules:signing"))

    testImplementation(project(":modules:dian-client"))
    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.assertj)
    testRuntimeOnly(libs.junit.launcher)
}

application {
    mainClass = "com.cantte.cetus.dianmock.DianMockServer"
}
