# The DIAN mock for the benchmark stack. Build from the repository root:
#   docker build -f bench/dian-mock.Dockerfile .
# Same layering as apps/api/Dockerfile. Development only, never deployed.

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
COPY modules modules
COPY apps/dian-mock apps/dian-mock
RUN ./gradlew :apps:dian-mock:installDist --no-daemon

FROM eclipse-temurin:25.0.4_7-jre
WORKDIR /app
COPY --from=build /workspace/apps/dian-mock/build/install/dian-mock/ ./
EXPOSE 8090
CMD ["bin/dian-mock"]
