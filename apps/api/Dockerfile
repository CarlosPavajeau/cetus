# syntax=docker/dockerfile:1
# The API as a native binary (Mandrel). Build from the repository root: docker build -f apps/api/Dockerfile .
# Rollback: apps/api/Dockerfile.jvm, the same API on the JVM.
#
# Layers go from what changes least to what changes most, so a build only redoes what changed:
#   1. Gradle wrapper  2. dependencies (build scripts)  3. sources.
# A change to the console or to another app's sources does not touch any of them.

# Mandrel's JDK runs Gradle and native-image. The binary bakes in this JDK's cacerts when it is built, so the
# CAs update-trust.sh removes are removed here, before the build.
FROM quay.io/quarkus/ubi9-quarkus-mandrel-builder-image:25.0.5.0-Final-java25-2026-11-08 AS java-build-base
USER root
COPY infra/security/update-trust.sh /usr/local/bin/cetus-update-trust
RUN sh /usr/local/bin/cetus-update-trust

# Every Gradle build script, with the wrapper and the convention plugins, in the same directory layout.
# This stage reruns on any change, but its output only changes with the build scripts.
FROM java-build-base AS gradle-files
WORKDIR /src
COPY . .
RUN mkdir /out \
    && cp -r gradlew gradle build-logic settings.gradle.kts build.gradle.kts gradle.properties /out/ \
    && find modules apps -name build.gradle.kts -exec cp --parents {} /out/ \;

FROM java-build-base AS build
WORKDIR /workspace
COPY --from=gradle-files /out/gradlew ./
COPY --from=gradle-files /out/gradle gradle
# ~/.gradle (dependencies and the build cache) persists between builds, so unchanged modules come from the
# cache. Railway only keeps a cache mount whose id is s/<service id>-<path>, with the ID written out.
RUN --mount=type=cache,id=s/f78bcbc5-5ea7-4a62-a6bb-812ac9c32864-/root/.gradle,target=/root/.gradle ./gradlew --version --no-daemon
COPY --from=gradle-files /out ./
RUN --mount=type=cache,id=s/f78bcbc5-5ea7-4a62-a6bb-812ac9c32864-/root/.gradle,target=/root/.gradle ./gradlew :apps:api:resolveDependencies --no-daemon
COPY modules modules
COPY apps/api apps/api
# native-image's heap. With 4 GB on Railway's builder (4 cores) it spent 83% of the analysis in GC; bench/
# passes 4g, since Docker on a laptop has less memory than Railway's builder.
ARG NATIVE_IMAGE_XMX=8g
RUN --mount=type=cache,id=s/f78bcbc5-5ea7-4a62-a6bb-812ac9c32864-/root/.gradle,target=/root/.gradle ./gradlew :apps:api:build -x test --no-daemon \
    -Dorg.gradle.jvmargs=-Xmx1g \
    -Dquarkus.native.enabled=true -Dquarkus.package.jar.enabled=false -Dquarkus.native.container-build=false \
    -Dquarkus.native.native-image-xmx=${NATIVE_IMAGE_XMX} \
    && cp apps/api/build/*-runner /workspace/cetus-api

FROM quay.io/quarkus/ubi9-quarkus-micro-image:2.0-2026-11-08
WORKDIR /app
COPY --from=build /workspace/cetus-api ./
# Calibrated for a 512 MB container (bench/evidence/2026-11-17-api-memory). The native image only has Serial GC: a
# young generation this large keeps it from collecting on every few requests, which a smaller heap made the
# bottleneck under load. Above what it uses, the binary returns memory, so the container stays well below this.
ENV NATIVE_OPTS="-Xmx384m -Xmn256m -Duser.timezone=America/Bogota"
USER 10001:10001
EXPOSE 8080
# exec: the binary replaces the shell as PID 1 and gets the SIGTERM of a deploy, so Quarkus shuts down cleanly
# instead of being killed when the stop timeout runs out.
CMD ["sh", "-c", "exec ./cetus-api $NATIVE_OPTS"]
