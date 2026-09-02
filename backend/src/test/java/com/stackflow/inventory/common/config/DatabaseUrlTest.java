package com.stackflow.inventory.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class DatabaseUrlTest {

    @Test
    @DisplayName("translates a platform DATABASE_URL into JDBC parts")
    void parsesPlatformUrl() {
        Optional<DatabaseUrl> parsed =
                DatabaseUrl.parse("postgres://stackflow:s3cret@db.internal:5432/stackflow_prod");

        assertThat(parsed).isPresent();
        assertThat(parsed.get().jdbcUrl()).isEqualTo("jdbc:postgresql://db.internal:5432/stackflow_prod");
        assertThat(parsed.get().username()).isEqualTo("stackflow");
        assertThat(parsed.get().password()).isEqualTo("s3cret");
    }

    @Test
    void keepsQueryParametersSuchAsSslMode() {
        DatabaseUrl parsed = DatabaseUrl.parse("postgresql://u:p@host/db?sslmode=require").orElseThrow();

        assertThat(parsed.jdbcUrl()).isEqualTo("jdbc:postgresql://host:5432/db?sslmode=require");
    }

    @Test
    @DisplayName("decodes percent-encoded credentials — generated passwords contain / and @")
    void decodesEscapedCredentials() {
        DatabaseUrl parsed = DatabaseUrl.parse("postgres://user%40corp:pa%2Fss@host:6543/db").orElseThrow();

        assertThat(parsed.username()).isEqualTo("user@corp");
        assertThat(parsed.password()).isEqualTo("pa/ss");
        assertThat(parsed.jdbcUrl()).isEqualTo("jdbc:postgresql://host:6543/db");
    }

    @Test
    @DisplayName("handles a Supabase session-pooler URL, dotted username and all")
    void parsesSupabasePoolerUrl() {
        DatabaseUrl parsed = DatabaseUrl.parse(
                        "postgresql://postgres.abcdefghijklmnop:s3cret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require")
                .orElseThrow();

        assertThat(parsed.jdbcUrl())
                .isEqualTo("jdbc:postgresql://aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require");
        assertThat(parsed.username()).isEqualTo("postgres.abcdefghijklmnop");
        assertThat(parsed.password()).isEqualTo("s3cret");
    }

    @Test
    void leavesAnExistingJdbcUrlAlone() {
        assertThat(DatabaseUrl.parse("jdbc:postgresql://localhost:5432/stackflow")).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "not a url", "mysql://user:pass@host/db", "postgres://host"})
    void ignoresAnythingItCannotTranslate(String value) {
        assertThat(DatabaseUrl.parse(value)).isEmpty();
    }

    @Test
    @DisplayName("the dashboard's placeholder password is not a usable URL")
    void rejectsTheSupabasePlaceholder() {
        // Copied straight from the Supabase dashboard without substituting the password — the
        // single most common way this variable is set wrongly.
        assertThat(DatabaseUrl.parse(
                        "postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"))
                .isEmpty();
    }

    @Test
    @DisplayName("an unencoded @ in the password cannot be parsed")
    void rejectsUnencodedAtSignInPassword() {
        // "p@ss" splits the URI at the wrong @, leaving a host that does not exist.
        DatabaseUrl parsed = DatabaseUrl.parse("postgres://user:p@ss@host:5432/db").orElse(null);
        assertThat(parsed == null || !"host".equals(hostOf(parsed))).isTrue();
    }

    private static String hostOf(DatabaseUrl url) {
        String withoutScheme = url.jdbcUrl().replace("jdbc:postgresql://", "");
        return withoutScheme.substring(0, withoutScheme.indexOf(':'));
    }

    @Test
    void ignoresNull() {
        assertThat(DatabaseUrl.parse(null)).isEmpty();
    }
}
