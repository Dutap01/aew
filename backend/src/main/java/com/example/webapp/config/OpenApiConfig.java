package com.example.webapp.config;

import java.util.ArrayList;

import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.info.Info;

/**
 * OpenAPI 명세 (Swagger UI: /swagger-ui.html, JSON: /v3/api-docs).
 * 프런트는 npm run gen:api 로 이 명세에서 TypeScript 타입을 만든다.
 *
 * 응답 DTO(record)는 Jackson 이 모든 필드를 항상 내보내므로 모든 속성을 required 로 표시한다.
 * 값이 없을 수 있는 필드는 DTO 에 @Schema(types = {"string", "null"}) 를 붙인다 (OpenAPI 3.1) → TS 에서 `string | null`.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    OpenApiCustomizer requiredProperties() {
        return openApi -> {
            openApi.info(new Info().title("학원 LMS API").version("v1"));
            if (openApi.getComponents() == null || openApi.getComponents().getSchemas() == null) {
                return;
            }
            openApi.getComponents().getSchemas().values().forEach(schema -> {
                if (schema.getProperties() != null && !schema.getProperties().isEmpty()) {
                    schema.setRequired(new ArrayList<>(schema.getProperties().keySet()));
                }
            });
        };
    }
}
