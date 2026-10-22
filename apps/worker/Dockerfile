# Build from the repository root: docker build -f apps/worker/Dockerfile .
#
# Layers go from what changes least to what changes most, so a build only redoes what changed:
#   1. Gradle wrapper  2. dependencies (build scripts)  3. sources.
# A change to the console or to another app's sources does not touch any of them.

# Every Gradle build script, with the wrapper and the convention plugins, in the same directory layout.
# This stage reruns on any change, but its output only changes with the build scripts.
FROM eclipse-temurin:25.0.4_7-jdk AS gradle-files
WORKDIR /src
COPY . .
RUN mkdir /out \
    && cp -r gradlew gradle build-logic settings.gradle.kts build.gradle.kts gradle.properties /out/ \
    && find modules apps -name build.gradle.kts -exec cp --parents {} /out/ \;

FROM eclipse-temurin:25.0.4_7-jdk AS build
WORKDIR /workspace
COPY --from=gradle-files /out/gradlew ./
COPY --from=gradle-files /out/gradle gradle
RUN ./gradlew --version --no-daemon
COPY --from=gradle-files /out ./
RUN ./gradlew :apps:worker:resolveDependencies --no-daemon
COPY modules modules
COPY apps/worker apps/worker
RUN ./gradlew :apps:worker:build -x test --no-daemon

FROM eclipse-temurin:25.0.4_7-jre
WORKDIR /app
COPY --from=build /workspace/apps/worker/build/quarkus-app/ ./
# The heap gets 40% of the container (410 MB of 1 GB): the JVM takes ~500 MB more outside it (metaspace, JIT
# code, threads, malloc), and on Java 25 SerialGC grows the heap up to its maximum, so 75% filled the container.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=40 -Duser.timezone=America/Bogota"
EXPOSE 8081
CMD ["sh", "-c", "java $JAVA_OPTS -jar quarkus-run.jar"]
