package hanium.damso.service;

import hanium.damso.dto.LinkDTO;

import java.util.List;

/**
 * 보호자-피보호인 연결과, 그 연결이 정하는 열람 권한.
 *
 * <p><b>판정 메서드는 모두 자기 예외를 잡고 거부로 답한다.</b> 조회가 실패했을 때 예외를 위로
 * 던지면 컨트롤러가 그것을 UNKNOWN_ERROR로 옮기는데, 그 사이 어딘가에서 한 번이라도 "실패했으니
 * 일단 통과"가 되면 권한이 새어 나간다. DB가 죽었을 때의 안전한 답은 "안 됩니다"다.
 */
public interface ILinkService {
    /** 대조에 성공한 어르신의 이름/전화번호만. wardId는 담기지 않는다. 없거나 둘 이상이면 null. */
    LinkDTO verify(String name, String residentFront, String residentBackFirst, String phone) throws Exception;

    /** 이미 연결돼 있으면 IllegalStateException("ALREADY_LINKED"). 대조 실패면 null. */
    LinkDTO link(String guardianId, String name, String residentFront, String residentBackFirst,
                 String phone, String relation) throws Exception;

    List<LinkDTO> getWards(String guardianId) throws Exception;

    List<LinkDTO> getGuardians(String wardId) throws Exception;

    int unlink(String guardianId, String wardId) throws Exception;

    /**
     * guardianId가 wardId의 보호자로 연결돼 있는가.
     *
     * <p>{@code throws}가 없는 것은 의도다. 판정 메서드는 예외를 밖으로 내보내지 않고 거부로
     * 답하므로, 호출부가 이걸 try 안에 넣을 이유가 없다. 시그니처가 그 계약을 말하게 둔다.
     */
    boolean isGuardianOf(String guardianId, String wardId);

    /** viewerId가 ownerId의 글을 읽어도 되는가 — 본인이거나 연결된 보호자. */
    boolean canView(String ownerId, String viewerId);

    /**
     * viewerId가 ownerId의 일기에 댓글을 쓸 수 있는가.
     *
     * <p>연결된 보호자만이고 <b>본인은 제외</b>다. {@link #canView}와 일부러 다르다 — 읽기 규칙과
     * 쓰기 규칙을 한 메서드로 합치면 이 차이를 표현할 수 없다.
     */
    boolean canComment(String ownerId, String viewerId);
}
