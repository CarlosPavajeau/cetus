// Hibernate ORM with Panache entities + Flyway migrations for the "billing" schema.
plugins {
    id("cetus.java-library")
}

dependencies {
    api(project(":modules:domain"))
    implementation(enforcedPlatform(libs.quarkus.bom))
    api(libs.quarkus.hibernate.orm.panache)
    api(libs.quarkus.jdbc.postgresql)
    api(libs.quarkus.jackson)
}
