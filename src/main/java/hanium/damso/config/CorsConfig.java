package hanium.damso.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * /api 로의 교차 출처 요청 허용 목록.
 *
 * <p>인증 수단이 JSESSIONID 쿠키라서 allowCredentials가 켜져 있어야 하고, 켜져 있으면 명세상
 * "*" 출처를 쓸 수 없다. 그래서 출처를 하나씩 적는다. 기본값은 Vite 개발 서버다.
 */
@Configuration
class CorsConfig implements WebMvcConfigurer {
    private final String[] allowedOrigins;

    CorsConfig(@Value("${damso.cors.allowed-origins}") String allowedOrigins) {
        this.allowedOrigins = allowedOrigins.split("\s*,\s*");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
