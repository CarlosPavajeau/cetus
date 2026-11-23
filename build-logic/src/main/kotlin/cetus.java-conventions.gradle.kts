// Shared settings for every Java project in the repo.
import net.ltgt.gradle.errorprone.errorprone

plugins {
    java
    id("com.diffplug.spotless")
    id("net.ltgt.errorprone")
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
    }
}

configurations.configureEach {
    resolutionStrategy.force("org.postgresql:postgresql:42.7.14")
}

// gradle.lockfile pins every resolved dependency: the build is reproducible and Trivy can see the Java
// dependencies, which the native API binary no longer exposes. Refresh with `mise run gradle-locks`.
dependencyLocking {
    lockAllConfigurations()
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
    options.release = 25
    // Keeps parameter names for Jackson, JAX-RS and records.
    options.compilerArgs.addAll(listOf("-parameters", "-Xmaxerrs", "1000"))
}

val errorproneChecks = ":lint:errorprone"

dependencies {
    add("errorprone", versionCatalogs.named("libs").findLibrary("errorprone-core").get())
    if (project.path != errorproneChecks) {
        add("errorprone", project(errorproneChecks))
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.errorprone {
        // Only errors fail the build; warnings nobody acts on would bury them in every compilation.
        disableAllWarnings = true
        excludedPaths = ".*/build/generated/.*"
        error(
            "CheckReturnValue",
            "FutureReturnValueIgnored",
            "UnusedVariable",
            "MissingCasesInEnumSwitch",
            "EqualsIncompatibleType",
        )
        if (name == "compileJava" && project.path != errorproneChecks) {
            disable("RawJsonInTests")
        }
    }
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
    systemProperty("user.timezone", "America/Bogota")
    // Testcontainers (and Quarkus Dev Services) default to Docker API 1.32, which Docker Engine 29+
    // answers with an empty /info. 1.44 = Docker 25+.
    systemProperty("api.version", "1.44")
}

// Downloads the project's dependencies without compiling it, so the Dockerfiles can cache them in a layer
// of their own that only changes with the build scripts (see apps/*/Dockerfile).
tasks.register("resolveDependencies") {
    description = "Downloads every resolvable dependency of this project."
    doLast {
        configurations.filter { it.isCanBeResolved }.forEach { it.resolve() }
    }
}

// The module graph, checked on the resolved classpaths so a path through another module counts too.
val dependenciesForbidden = mapOf(
    ":apps:api" to setOf(":modules:dian-client"),
)
val dependenciesForbiddenReason = mapOf(
    ":modules:dian-client" to "the API validates, numbers, stores and enqueues; only the worker calls the DIAN",
)
val withoutDependencies = setOf(":modules:domain")

val checkModuleGraph = tasks.register("checkModuleGraph") {
    description = "Fails when this project reaches a module or a library the module graph does not allow."
    group = "verification"
    val projectPath = project.path
    val forbidden = dependenciesForbidden[projectPath].orEmpty()
    val isolated = projectPath in withoutDependencies
    val roots = listOf("compileClasspath", "runtimeClasspath").map { name ->
        configurations.named(name).flatMap { it.incoming.resolutionResult.rootComponent }
    }
    doLast {
        val reached = roots.flatMap { root -> componentsReachable(root.get()) }.toSortedSet()
        val violations = if (isolated) reached else reached.filter { it in forbidden }
        if (violations.isNotEmpty()) {
            val reasons = violations.map { "$it: ${dependenciesForbiddenReason[it] ?: "not allowed here"}" }
            val rule = if (isolated) "$projectPath is plain Java and depends on nothing" else "$projectPath must not reach"
            throw GradleException("$rule:\n  " + reasons.joinToString("\n  "))
        }
    }
}

tasks.named("check") { dependsOn(checkModuleGraph) }

fun componentsReachable(root: org.gradle.api.artifacts.result.ResolvedComponentResult): List<String> {
    val seen = mutableSetOf<org.gradle.api.artifacts.result.ResolvedComponentResult>()
    val pending = ArrayDeque(listOf(root))
    while (pending.isNotEmpty()) {
        pending.removeFirst().dependencies
            .filterIsInstance<org.gradle.api.artifacts.result.ResolvedDependencyResult>()
            .map { it.selected }
            .filter(seen::add)
            .forEach(pending::addLast)
    }
    return seen.map { component ->
        when (val id = component.id) {
            is org.gradle.api.artifacts.component.ProjectComponentIdentifier -> id.projectPath
            else -> id.displayName
        }
    }
}

spotless {
    // Checked in CI (java-format.yml), not by `check`: the Docker images run `build` and must not fail on formatting.
    isEnforceCheck = false
    java {
        palantirJavaFormat(versionCatalogs.named("libs").findVersion("palantir-java-format").get().requiredVersion)
    }
}
