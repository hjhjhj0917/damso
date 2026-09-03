package hanium.damso.service;

import org.springframework.core.io.Resource;

/**
 * 말을 글로, 글을 말로.
 *
 * <p>모델 호출({@link ILLMService})과 나눠 둔 이유는 부르는 서버가 다르기 때문이다. 전사와 합성은
 * 서로 다른 URL과 서로 다른 키를 쓰고, 한쪽만 켠 배포가 얼마든지 말이 된다.
 *
 * <p>두 메서드 모두 <b>대화를 알지 못한다.</b> 어느 방의 무슨 발화인지는 여기 들어오지 않는다 —
 * 넘겨받은 소리를 옮기고 넘겨받은 글을 읽을 뿐이다.
 */
public interface ISpeechService {
    /**
     * 녹음을 글로 옮긴다.
     *
     * <p>들린 것이 없으면 빈 문자열이다. <b>예외가 아니다</b> — 버튼을 눌러 놓고 아무 말도 하지
     * 않은 사람은 아무 잘못도 하지 않았고, 그 답은 실패가 아니라 다시 묻는 것이다.
     *
     * @throws ServiceUnavailableException STT_URL이 설정되지 않았거나, 키가 거절당했을 때
     * @throws IllegalArgumentException    녹음이 이 서비스가 한 번에 보내는 크기를 넘었을 때
     */
    String transcribe(Resource audio) throws Exception;

    /**
     * 글을 소리로 읽는다. 돌려주는 것은 재생 가능한 WAV 한 덩어리.
     *
     * @throws ServiceUnavailableException TTS_URL이 설정되지 않았거나, 키가 거절당했을 때
     * @throws IllegalArgumentException    글이 한 번에 읽어 주는 길이를 넘었을 때
     */
    Resource synthesize(String text) throws Exception;

    /** 전사를 부를 수 있는 상태인가. 화면이 마이크 버튼을 미리 감추는 용도. */
    boolean isSttConfigured();

    /** 합성을 부를 수 있는 상태인가. 화면이 스피커 버튼을 미리 감추는 용도. */
    boolean isTtsConfigured();
}
