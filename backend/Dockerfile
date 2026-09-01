# Multi-stage: the JDK and the Maven cache stay out of the runtime image.
# Jammy rather than Alpine images — Temurin 17 publishes no arm64 Alpine variant, so Alpine here
# would break every Apple Silicon and arm64 CI machine.
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /build

# Dependency layer first so source edits do not re-download the world.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src/ src/
RUN ./mvnw -B -q clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy AS runtime
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app app
COPY --from=build /build/target/*.jar app.jar
USER app
EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
