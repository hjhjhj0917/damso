package hanium.damso.service;

import hanium.damso.dto.ContentDTO;

/**
 * CONTENT_MASTER를 다루는 유일한 통로.
 *
 * <p>일기·일정·자서전·대화방 서비스가 전부 이것을 주입받는다. 소유권 판정과 소프트 삭제가 네 군데로
 * 흩어지지 않게 하는 것이 이 인터페이스의 존재 이유다.
 *
 * <p><b>{@link #owns}와 보호자 열람 권한은 서로 다른 질문이다.</b> 여기 있는 것은 "네 것이냐"만
 * 답한다. "연결된 보호자가 읽어도 되느냐"는 ILinkService가 답한다. 둘을 하나로 합치면 일기 댓글
 * 권한 규칙(보호자만 쓰고 본인은 못 쓴다)을 표현할 수 없다.
 */
public interface IContentService {
    /** 마스터 행을 만들고 CONTENT_ID를 돌려준다. 자식 행 INSERT는 호출자 몫이며 같은 트랜잭션이어야 한다. */
    String create(String userId, ContentDTO.Type type) throws Exception;

    /** 없거나 삭제됐으면 null. */
    ContentDTO getInfo(String contentId) throws Exception;

    boolean owns(String contentId, String userId) throws Exception;

    /** 자식 행이 바뀌었음을 마스터의 UPDATED_AT에 반영한다. */
    int touch(String contentId) throws Exception;

    /** 소프트 삭제. 주인이 아니면 0. */
    int delete(String contentId, String userId) throws Exception;
}
