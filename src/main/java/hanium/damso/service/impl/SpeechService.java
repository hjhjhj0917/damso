package hanium.damso.service.impl;

import hanium.damso.dto.SpeechDTO;
import hanium.damso.service.ISpeechService;
import hanium.damso.service.ServiceUnavailableException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/**
 * OpenAI 호환 음성 서버를 부른다.
 *
 * <p>{@link LLMService}와 같은 모양이고, 같은 이유로 같은 규칙을 지킨다: 공용 {@code RestClient}를
 * 주입받되 <b>키는 요청마다 붙인다</b>(그 빈을 쓰는 다른 호출에 우리 키가 실려 나가지 않도록),
 * 그리고 "안 켠 것"과 "고장 난 것"을 갈라 답한다.
 *
 * <p><b>방언 분기가 없다.</b> 요청 모양은 OpenAI 호환 하나뿐이다 — 전사는
 * {@code /v1/audio/transcriptions} multipart, 합성은 {@code /v1/audio/speech} JSON. 구글 클라우드
 * 경로(base64-in-JSON, 서비스 계정 토큰)와 음성 변환(STS)은 이 서비스에 없다.
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class SpeechService implements ISpeechService {
    private final RestClient restClient;

    @Value("${damso.stt.url}")
    private String STT_URL;

    @Value("${damso.stt.key}")
    private String STT_KEY;

    @Value("${damso.stt.model}")
    private String STT_MODEL;

    @Value("${damso.stt.language}")
    private String STT_LANGUAGE;

    @Value("${damso.tts.url}")
    private String TTS_URL;

    @Value("${damso.tts.key}")
    private String TTS_KEY;

    @Value("${damso.tts.model}")
    private String TTS_MODEL;

    @Value("${damso.tts.voice}")
    private String TTS_VOICE;

    @Value("${damso.tts.speed}")
    private double TTS_SPEED;

    /**
     * 합성 결과의 형식. 설정이 아니다.
     *
     * <p>{@code SpeechController}의 {@code produces = "audio/wav"}와 한 몸이다. 이 값을 바꾸면
     * 그쪽도 같은 커밋에서 바꿔야 하고, 안 바꾸면 브라우저는 wav라고 적힌 mp3를 받는다.
     */
    static final String SPEECH_FORMAT = "wav";

    /**
     * 한 번에 보내는 녹음의 크기. 초가 아니라 <b>바이트</b>다.
     *
     * <p>초로 잴 수 없어서가 아니라, 바이트가 이 자리에서 알 수 있는 유일한 값이기 때문이다.
     * 형식이 무엇이든 길이를 알려면 디코딩해야 한다.
     *
     * <p>화면의 레코더는 60초에서 멈추고, 16kHz 16bit 모노 기준 그것은 약 1.9MB다. 이 상한은
     * 그 화면이 아니라 <b>그 밖의 모든 호출자</b>를 위한 것이다: multipart 한도가 10MB이므로,
     * 이 검사가 없으면 10MB짜리 업로드가 외부 API까지 가서 거절당하고 <b>그 시도에 대한 요금</b>만
     * 남는다. 여기서 막으면 아무도 부르지 않고 아무것도 청구되지 않는다.
     */
    static final int MAX_AUDIO_BYTES = 8_000_000;

    /**
     * 한 번에 읽어 주는 글의 길이.
     *
     * <p>합성은 글자 수로 청구된다. 이 상한이 없으면 로그인한 계정 하나가 메가바이트짜리 text를
     * 반복해서 보내는 것만으로 요금을 만들 수 있다. 도담의 한 마디는 길어야 수백 자다.
     */
    static final int MAX_SPEECH_CHARS = 2_000;

    @Override
    public boolean isSttConfigured() {
        return STT_URL != null && !STT_URL.isBlank();
    }

    @Override
    public boolean isTtsConfigured() {
        return TTS_URL != null && !TTS_URL.isBlank();
    }

    @Override
    public String transcribe(Resource audio) throws Exception {
        // 무엇을 읽기도 전에. 음성을 켜지 않은 배포는 녹음을 메모리로 끌어올리지도 않는다.
        String url = LLMService.configured(STT_URL, "STT_URL");

        long size = audio.contentLength();
        if (size > MAX_AUDIO_BYTES) {
            // ServiceUnavailableException이 아니다. 기능은 켜져 있고 잘 동작하며, 이 호출자가
            // 너무 많이 보냈을 뿐이다. 컨트롤러가 TRANSCRIPTION_FAILED로 답한다.
            throw new IllegalArgumentException(
                    "recording is " + size + " bytes, over the " + MAX_AUDIO_BYTES + " this endpoint sends");
        }

        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        parts.add("file", audio);
        // 평문으로 받는다. json을 받아 파싱하면 서버마다 다른 봉투를 읽어야 하는데, 우리가 쓰는
        // 것은 문장 하나뿐이다.
        parts.add("response_format", "text");
        // 0.0은 "지어내지 말라"에 가장 가까운 값이다. 어르신이 웅얼거린 대목에서 모델이 그럴듯한
        // 문장을 만들어 내면, 그것은 노트에 남고 나중에 자서전이 된다.
        parts.add("temperature", "0.0");

        String model = optional(STT_MODEL);
        if (model != null) parts.add("model", model);

        String language = optional(STT_LANGUAGE);
        if (language != null) parts.add("language", language);

        log.debug("STT request: model={} language={} bytes={}", model, language, size);

        RestClient.RequestBodySpec request = restClient.post().uri(url);
        // 키가 비면 헤더를 아예 붙이지 않는다. 자체 호스팅 whisper가 원하는 모양이다.
        // trim()은 장식이 아니다 — 콘솔에서 복사한 키에는 개행이 붙어 온다.
        String key = optional(STT_KEY);
        if (key != null) request = request.header("Authorization", "Bearer " + key);

        String transcript;
        try {
            transcript = request.body(parts).retrieve().body(String.class);
        } catch (HttpClientErrorException e) {
            throw refused(e, "STT_URL");
        }

        // 어르신이 한 말은 대화에 남지 로그에 남지 않는다. 길이만 적는다.
        log.debug("Transcribed {} chars", transcript == null ? 0 : transcript.length());

        // 침묵은 "" 로 답한다. null과 빈 문자열을 호출부가 구분하지 않아도 되도록 여기서 정리한다.
        return transcript == null ? "" : transcript.trim();
    }

    @Override
    public Resource synthesize(String text) throws Exception {
        String url = LLMService.configured(TTS_URL, "TTS_URL");

        if (text == null || text.isBlank())
            throw new IllegalArgumentException("nothing to speak");
        if (text.length() > MAX_SPEECH_CHARS)
            throw new IllegalArgumentException(
                    "text is " + text.length() + " chars, over the " + MAX_SPEECH_CHARS + " this endpoint reads");

        SpeechDTO.QueryDTO qDTO = new SpeechDTO.QueryDTO(
                optional(TTS_MODEL), text, optional(TTS_VOICE), SPEECH_FORMAT, TTS_SPEED);

        // 읽어 줄 내용이 아니라 길이만. 여기 실린 text는 도담이 어르신에게 하는 말이다.
        log.debug("TTS request: model={} voice={} speed={} ({} chars)",
                TTS_MODEL, TTS_VOICE, TTS_SPEED, text.length());

        RestClient.RequestBodySpec request = restClient.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON);

        // 전사 쪽과 같은 규칙. 비면 헤더를 붙이지 않는다 — "Bearer null"은 틀린 키와 똑같이 생겼다.
        String key = optional(TTS_KEY);
        if (key != null) request = request.header("Authorization", "Bearer " + key);

        Resource audio;
        try {
            audio = request.body(qDTO).retrieve().body(Resource.class);
        } catch (HttpClientErrorException e) {
            throw refused(e, "TTS_URL");
        }

        if (audio == null || audio.contentLength() == 0) {
            // 200인데 안이 비었다. 빈 Resource를 그대로 돌려주는 것이 실패보다 나쁘다 —
            // 브라우저는 0바이트 audio/wav를 받아 아무것도 재생하지 않고 아무것도 보고하지 않는다.
            log.warn("speech server answered with no audio");
            throw new IllegalStateException("speech server returned no audio");
        }

        return audio;
    }

    /**
     * 비어 있으면 null. JSON 멤버를 빼고 폼 필드를 생략하는 데 둘 다 쓴다.
     *
     * <p>빈 문자열을 그대로 보내면 안 되는 자리라서 있는 함수다. 이름 자리에 ""를 보내는 것은
     * "지정하지 않음"이 아니라 "어느 것과도 맞지 않는 이름"이고, 서버는 그것을 400으로 답한다.
     */
    static String optional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /**
     * 401/403을 "안 켠 것"과 같은 칸에 넣는다.
     *
     * <p>{@link LLMService#complete}가 하는 것과 같은 판단이다. 키가 거절당한 것은 요청의 문제가
     * 아니라 배포의 문제이고, 사용자가 다시 눌러서 될 일이 아니다. 429는 반대라서 여기로 오지
     * 않는다 — "나중에"라는 뜻이므로 재시도 가능한 실패로 남아야 한다.
     */
    static RuntimeException refused(HttpClientErrorException e, String variable) {
        int status = e.getStatusCode().value();
        if (status == 401 || status == 403) {
            log.warn("speech server refused our credentials for {}: {}", variable, status);
            return new ServiceUnavailableException(variable + " key was rejected (" + status + ")");
        }

        return e;
    }
}
