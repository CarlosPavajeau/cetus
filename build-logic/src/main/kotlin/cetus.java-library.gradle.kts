// Library modules: plain jars consumed by the Quarkus apps.
// CDI beans are discovered because every library ships an empty META-INF/beans.xml.
plugins {
    id("cetus.java-conventions")
    `java-library`
}
