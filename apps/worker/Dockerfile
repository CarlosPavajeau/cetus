# Build from the repository root: docker build -f apps/worker/Dockerfile .
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY . .
RUN ./gradlew :apps:worker:build -x test --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/apps/worker/build/quarkus-app/ ./
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -Duser.timezone=America/Bogota"
EXPOSE 8081
CMD ["sh", "-c", "java $JAVA_OPTS -jar quarkus-run.jar"]
