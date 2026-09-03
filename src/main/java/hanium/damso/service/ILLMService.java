package hanium.damso.service;

import hanium.damso.dto.LLMDTO;

import java.util.List;

/**
 * 모델 한 번 부르기.
 *
 * <p>채팅 서비스에 붙이지 않고 따로 뺀 이유: 모델을 부르는 기능이 둘이다(대화 응답, 자서전 생성).
 */
public interface ILLMService {
    /**
     * 대화를 넘기고 어시스턴트의 글을 받는다. 쓸 만한 답이 없으면 null.
     *
     * @param format 비어 있지 않으면 JSON 객체 하나로 답하라고 요청한다. 산문 답변에는 null.
     * @throws ServiceUnavailableException URL이나 키가 설정되지 않았거나, 키가 거절당했을 때
     */
    String complete(List<LLMDTO.MessageDTO> messages, String format) throws Exception;

    /** 모델을 부를 수 있는 상태인가. 화면이 미리 회색 처리하는 용도. */
    boolean isConfigured();
}
