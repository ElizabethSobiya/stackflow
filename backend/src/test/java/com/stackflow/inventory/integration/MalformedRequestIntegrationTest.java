package com.stackflow.inventory.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Requests Spring rejects before any controller runs.
 *
 * <p>These all used to fall through to the catch-all handler and be reported as 500, which told a
 * caller their own mistake was a server fault and logged it at ERROR beside genuine failures.
 *
 * <p>Authentication is stubbed rather than registered: only the first account in a database becomes
 * ADMIN, so registering one here would silently demote another test class's operator.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MalformedRequestIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("a value outside an enum's constants is a bad request, not a server error")
    void rejectsUnknownEnumConstant() throws Exception {
        mockMvc.perform(post("/api/stock/1/adjust")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"delta\":1,\"reason\":\"NOT_A_REASON\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("syntactically invalid JSON is a bad request")
    void rejectsMalformedJson() throws Exception {
        mockMvc.perform(post("/api/stock/1/adjust")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"delta\":1,"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("a field of the wrong type is a bad request")
    void rejectsWrongFieldType() throws Exception {
        mockMvc.perform(post("/api/stock/1/adjust")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"delta\":\"not-a-number\",\"reason\":\"DAMAGE_WRITE_OFF\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("an unmapped path is 404, not 500")
    void unmappedPathIsNotFound() throws Exception {
        mockMvc.perform(get("/api/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("a known path with the wrong verb is 405, not 500")
    void wrongVerbIsMethodNotAllowed() throws Exception {
        mockMvc.perform(get("/api/auth/login"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
    }
}
