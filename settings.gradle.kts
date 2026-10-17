pluginManagement {
    includeBuild("build-logic")
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositories {
        mavenCentral()
    }
}

rootProject.name = "cetus"

include(
    "modules:domain",
    "modules:persistence",
    "modules:jobs",
    "modules:ubl",
    "modules:signing",
    "modules:dian-client",
    "modules:aws",
    "apps:api",
    "apps:worker",
    "apps:dian-mock",
)
