// XML signatures built only on the JDK's javax.xml.crypto (JSR 105) API.
plugins {
    id("cetus.java-library")
}

dependencies {
    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.assertj)
    testRuntimeOnly(libs.junit.launcher)
}
