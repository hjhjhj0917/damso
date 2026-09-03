package hanium.damso.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * 외부 HTTP 호출용 공용 클라이언트.
 *
 * <p>타임아웃을 명시하는 것이 이 설정의 존재 이유다. 기본값은 무한 대기라서, 모델 서버가 응답도
 * 거절도 하지 않고 붙잡고 있으면 그 요청을 처리하던 톰캣 스레드가 영영 돌아오지 않는다.
 * 그런 요청이 몇 개 쌓이면 채팅이 아니라 서비스 전체가 멈춘다.
 *
 * <p>읽기 60초는 넉넉하다. 긴 자서전 한 장을 쓰는 데 30초 넘게 걸리는 모델이 있다.
 *
 * <p><b>여기에 기본 헤더를 달지 않는다.</b> 특히 API 키를 달면 안 된다. 지금은 이 빈을 쓰는 곳이
 * LLMService 하나뿐이지만, 나중에 다른 외부 API를 부르는 코드가 이 빈을 주입받는 순간 그쪽
 * 요청에도 우리 키가 실려 나간다. 키는 보내는 자리에서 붙인다.
 */
@Configuration
class RestClientConfig {
    private static final int CONNECT_TIMEOUT_MS = 15_000;
    private static final int READ_TIMEOUT_MS = 60_000;

    @Bean
    RestClient restClient(RestClient.Builder builder) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT_MS);
        factory.setReadTimeout(READ_TIMEOUT_MS);

        return builder.requestFactory(factory).build();
    }
}
