// Rules about the code of every module and app that the compiler does not check. A failure names the rule and why.
plugins {
    id("cetus.java-conventions")
}

val apiRuntime = configurations.dependencyScope("apiRuntime")
val apiRuntimeClasspath = configurations.resolvable("apiRuntimeClasspath") {
    extendsFrom(apiRuntime.get())
    attributes {
        attribute(Usage.USAGE_ATTRIBUTE, objects.named(Usage.JAVA_RUNTIME))
        attribute(Category.CATEGORY_ATTRIBUTE, objects.named(Category.LIBRARY))
        attribute(LibraryElements.LIBRARY_ELEMENTS_ATTRIBUTE, objects.named(LibraryElements.JAR))
        attribute(Bundling.BUNDLING_ATTRIBUTE, objects.named(Bundling.EXTERNAL))
        attribute(TargetJvmEnvironment.TARGET_JVM_ENVIRONMENT_ATTRIBUTE, objects.named(TargetJvmEnvironment.STANDARD_JVM))
    }
}

val projectsChecked = rootProject.subprojects
    .map { it.path }
    .filter { it.startsWith(":modules:") || it.startsWith(":apps:") }

dependencies {
    projectsChecked.forEach { testImplementation(project(it)) }
    apiRuntime(project(":apps:api"))

    testImplementation(enforcedPlatform(libs.quarkus.bom))
    testImplementation(platform(libs.awssdk.bom))
    testImplementation(libs.microprofile.openapi.api)
    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.archunit.junit5)
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.assertj)
    testRuntimeOnly(libs.junit.launcher)
}

tasks.test {
    // The rule and its reason are in the failure message, which the default summary leaves out.
    testLogging {
        events("failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
        showStackTraces = false
    }
    val apiClasspath = apiRuntimeClasspath
    val apiProperties = rootProject.file("apps/api/src/main/resources/application.properties")
    inputs.files(apiClasspath).withNormalizer(ClasspathNormalizer::class)
    inputs.file(apiProperties).withPathSensitivity(PathSensitivity.NONE)
    jvmArgumentProviders.add(CommandLineArgumentProvider {
        listOf("-Dcetus.api.classpath=${apiClasspath.get().asPath}", "-Dcetus.api.properties=${apiProperties.path}")
    })
}
