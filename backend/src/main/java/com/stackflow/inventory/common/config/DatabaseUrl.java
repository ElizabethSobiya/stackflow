package com.stackflow.inventory.common.config;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Optional;

/**
 * Translates a platform-style database URL into JDBC parts.
 *
 * <p>Render, Railway, Heroku and Fly all inject a single {@code DATABASE_URL} shaped like
 * {@code postgres://user:password@host:5432/dbname?sslmode=require}. JDBC cannot consume that: the
 * driver needs {@code jdbc:postgresql://host:5432/dbname} with the credentials supplied separately.
 * Doing the translation here means a deployment needs no bespoke start-up script and no
 * hand-copied connection string.
 */
public record DatabaseUrl(String jdbcUrl, String username, String password) {

    private static final int DEFAULT_PORT = 5432;

    /**
     * @return the parsed parts, or empty when {@code value} is blank or already a JDBC URL (in which
     *     case it is usable as-is and needs no translation)
     */
    public static Optional<DatabaseUrl> parse(String value) {
        if (value == null || value.isBlank() || value.startsWith("jdbc:")) {
            return Optional.empty();
        }
        try {
            URI uri = new URI(value.trim());
            String scheme = uri.getScheme();
            if (scheme == null || !(scheme.equals("postgres") || scheme.equals("postgresql"))) {
                return Optional.empty();
            }
            String host = uri.getHost();
            String database = uri.getPath() == null ? "" : uri.getPath().replaceFirst("^/", "");
            if (host == null || database.isBlank()) {
                return Optional.empty();
            }

            int port = uri.getPort() == -1 ? DEFAULT_PORT : uri.getPort();
            String query = uri.getQuery() == null ? "" : "?" + uri.getQuery();
            String jdbcUrl = "jdbc:postgresql://%s:%d/%s%s".formatted(host, port, database, query);

            String[] credentials = splitUserInfo(uri.getUserInfo());
            return Optional.of(new DatabaseUrl(jdbcUrl, credentials[0], credentials[1]));
        } catch (URISyntaxException ex) {
            return Optional.empty();
        }
    }

    private static String[] splitUserInfo(String userInfo) {
        if (userInfo == null || userInfo.isBlank()) {
            return new String[] {null, null};
        }
        int separator = userInfo.indexOf(':');
        return separator < 0
                ? new String[] {decode(userInfo), null}
                : new String[] {decode(userInfo.substring(0, separator)), decode(userInfo.substring(separator + 1))};
    }

    private static String decode(String value) {
        return java.net.URLDecoder.decode(value, java.nio.charset.StandardCharsets.UTF_8);
    }
}
