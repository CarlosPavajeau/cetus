# Build from the repository root: docker build -f apps/api/Dockerfile .
#
# Layers go from what changes least to what changes most, so a build only redoes what changed:
#   1. Gradle wrapper  2. dependencies (build scripts)  3. sources.
# A change to the console or to another app's sources does not touch any of them.

# Every Gradle build script, with the wrapper and the convention plugins, in the same directory layout.
# This stage reruns on any change, but its output only changes with the build scripts.
FROM eclipse-temurin:21-jdk AS gradle-files
WORKDIR /src
COPY . .
RUN mkdir /out \
    && cp -r gradlew gradle build-logic settings.gradle.kts build.gradle.kts gradle.properties /out/ \
    && find modules apps -name build.gradle.kts -exec cp --parents {} /out/ \;

FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY --from=gradle-files /out/gradlew ./
COPY --from=gradle-files /out/gradle gradle
RUN ./gradlew --version --no-daemon
COPY --from=gradle-files /out ./
RUN ./gradlew :apps:api:resolveDependencies --no-daemon
COPY modules modules
COPY apps/api apps/api
RUN ./gradlew :apps:api:build -x test --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/apps/api/build/quarkus-app/ ./
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -Duser.timezone=America/Bogota"
EXPOSE 8080
CMD ["sh", "-c", "java $JAVA_OPTS -jar quarkus-run.jar"]
