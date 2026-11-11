package com.example.webapp;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class SpaWebConfigTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void spaRoutesReturnIndexHtml() throws Exception {
        for (String path : new String[] {"/admin", "/manager", "/login", "/admin/some/deep/path"}) {
            mockMvc.perform(get(path))
                    .andExpect(status().isOk())
                    .andExpect(content().string(containsString("SPA_TEST_INDEX")));
        }
    }

    @Test
    void apiStillWorks() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void unknownApiAndMissingFilesReturn404() throws Exception {
        mockMvc.perform(get("/api/does-not-exist")).andExpect(status().isNotFound());
        mockMvc.perform(get("/missing.js")).andExpect(status().isNotFound());
    }
}
