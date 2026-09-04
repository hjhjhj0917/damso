package hanium.damso.service.impl;

import hanium.damso.dto.LLMDTO;
import hanium.damso.service.ILLMService;
import hanium.damso.service.ServiceUnavailableException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.List;

@Slf4j
@RequiredArgsConstructor
@Service
public class LLMService implements ILLMService {
    private final RestClient restClient;

    @Value("${damso.llm.url}")
    private String LLM_URL;

    @Value("${damso.llm.model}")
    private String LLM_MODEL;

    @Value("${damso.llm.key}")
    private String LLM_KEY;

    @Override
    public boolean isConfigured() {
        return LLM_URL != null && !LLM_URL.isBlank() && LLM_KEY != null && !LLM_KEY.isBlank();
    }

    @Override
    public String complete(List<LLMDTO.MessageDTO> messages, String format) throws Exception {
        String url = configured(LLM_URL, "LLM_URL");

        // 키까지 여기서 본다. OpenAI는 익명 요청을 401로 거절하므로, 키 없이 보내 봐야 얻는 것은
        // "모델이 고장 났다"는 잘못된 진단뿐이다. 안 켠 것은 안 켠 것으로 답해야 한다.
        String key = configured(LLM_KEY, "OPENAI_API_KEY");

        LLMDTO.QueryDTO qDTO = new LLMDTO.QueryDTO(LLM_MODEL, messages, responseFormat(format));

        // 메타데이터만 남긴다. 여기 실린 messages는 어르신의 대화이고, 30턴이면 답변 한 번마다
        // 그 사람의 하루를 통째로 로그에 쏟게 된다.
        log.debug("LLM request: model={} turns={} format={}",
                LLM_MODEL, messages == null ? 0 : messages.size(), format == null ? "none" : format);

        LLMDTO.ResponseDTO result;
        try {
            result = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    // 요청마다 붙인다. RestClient 빈의 기본 헤더로 두면 이 빈을 쓰는 다른 호출에도
                    // 실려 나간다. trim()은 장식이 아니다 — 콘솔에서 복사한 키에는 개행이 붙어 오고,
                    // "Bearer …\n"은 틀린 키와 똑같이 생긴 헤더 오류로 실패한다.
                    .header("Authorization", "Bearer " + key.trim())
                    .body(qDTO)
                    .retrieve()
                    .body(LLMDTO.ResponseDTO.class);
        } catch (HttpClientErrorException e) {
            int status = e.getStatusCode().value();

            // 401/403은 요청이 아니라 키의 문제다. 다시 시도하거나 다르게 물어서 될 일이 아니고,
            // 변수를 안 넣은 것과 같은 사람이 고쳐야 한다. 그래서 설정 안 됨과 같은 답을 준다.
            // 429는 반대다 — "나중에"라는 뜻이라 재시도 가능해야 하므로 여기로 오면 안 된다.
            if (status == 401 || status == 403) {
                log.warn("LLM refused our credentials: {}", status);
                throw new ServiceUnavailableException("LLM key was rejected (" + status + ")");
            }
            throw e;
        }

        String content = result == null ? null : result.firstContent();
        if (content == null || content.isBlank()) {
            log.warn("LLM returned no usable content");
            return null;
        }

        return content.trim();
    }

    /**
     * 빈 값이면 "설정 안 됨"으로 던진다.
     */
    static String configured(String value, String variable) {
        if (value == null || value.isBlank())
            throw new ServiceUnavailableException(variable + " is not configured");
        return value;
    }

    /**
     * 구조화 출력 스위치. 빈 값이면 멤버를 아예 빼서 그 기능이 없는 서버에도 보낼 수 있게 한다.
     *
     * <p>알아듣지 못한 값에도 json_object를 요청한다. 여기까지 온 호출자는 JSON을 원한 것이 분명하고,
     * 오타 하나 때문에 산문을 받아 파싱에 실패하는 것보다는 낫다. 대신 로그를 남긴다.
     */
    static LLMDTO.QueryDTO.ResponseFormat responseFormat(String format) {
        if (format == null || format.isBlank()) return null;

        String value = format.trim();
        if (!value.equalsIgnoreCase("json") && !value.equalsIgnoreCase("json_object")) {
            log.warn("unrecognised LLM format {}, asking for json_object", value);
        }

        return LLMDTO.QueryDTO.ResponseFormat.JSON_OBJECT;
    }
}
