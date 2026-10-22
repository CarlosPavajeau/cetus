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
# AOT enabled: packages an aot-jar (every class on the JDK's class loader, which the AOT cache needs) and makes
# the app stop after static init when quarkus.appcds.generate is set. The cache Quarkus makes here, with the
# JDK, is dropped: the one that counts is made below with the runtime JVM.
RUN ./gradlew :apps:worker:build -x test --no-daemon \
    -Dquarkus.package.jar.aot.enabled=true -Dquarkus.package.jar.aot.phase=build \
    && rm -f apps/worker/build/quarkus-app/app.aot

FROM eclipse-temurin:25.0.4_7-jre
WORKDIR /app
COPY --from=build /workspace/apps/worker/build/quarkus-app/ ./
# AOT cache (JEP 483/514): the classes the app loads, already parsed and linked, so it starts and warms up faster.
# Quarkus stops right after static init when quarkus.appcds.generate is set, before it opens the database or
# AWS, so this runs without them. It runs in this image because the cache only works with the exact JVM that
# made it, and with SerialGC, the collector the service runs with.
RUN java -XX:+UseSerialGC -XX:AOTCacheOutput=app.aot -Dquarkus.appcds.generate=true -jar quarkus-run.jar
# The heap gets 40% of the container (410 MB of 1 GB): the JVM takes ~500 MB more outside it (metaspace, JIT
# code, threads, malloc), and on Java 25 SerialGC grows the heap up to its maximum, so 75% filled the container.
# SerialGC is what the JVM picks with one vCPU; it is explicit because the AOT cache was made with it.
# Without -XX:AOTCache the service runs as before, only without the cache.
ENV JAVA_OPTS="-XX:AOTCache=app.aot -XX:+UseSerialGC -XX:MaxRAMPercentage=40 -Duser.timezone=America/Bogota"
EXPOSE 8081
# exec: java replaces the shell as PID 1 and gets the SIGTERM of a deploy, so Quarkus shuts down cleanly
# instead of being killed when the stop timeout runs out.
CMD ["sh", "-c", "exec java $JAVA_OPTS -jar quarkus-run.jar"]
