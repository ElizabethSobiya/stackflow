# StackFlow API

Spring Boot 3.5 / Java 17 backend for the StackFlow inventory and order management system.

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev   # http://localhost:8080
./mvnw test                                             # unit + integration tests
./mvnw package                                          # runnable jar in target/
```

Requires a Postgres instance — `docker compose up -d postgres` from the repository root. Flyway
applies migrations at startup and the `dev` profile seeds demo data into an empty database.

Setup, architecture and API reference live in the [repository README](../README.md) and
[docs/](../docs).
