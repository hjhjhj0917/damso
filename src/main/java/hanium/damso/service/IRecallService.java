package hanium.damso.service;

import hanium.damso.dto.RecallDTO;

import java.util.List;

/**
 * 기억 회상 확인.
 *
 * <p>도담이 대화 중에 등록된 이야깃거리를 하나 슬쩍 여쭤보고, 어르신이 그것을 기억해 내셨는지를
 * 조용히 기록한다. 그 기록이 건강 리포트의 "기억 하지 못한 횟수"가 된다.
 *
 * <p>이 기능은 대화의 목적이 아니다. 대화의 목적은 말벗이고, 검사는 그 위에 조심스럽게
 * 얹힌 것이다. 그래서 게이트가 여러 겹이다 — 하루 한 번, 대화가 어느 정도 흐른 뒤에,
 * 모델이 자연스럽다고 판단했을 때만. 답을 받아내려고 다시 묻지 않는다.
 *
 * <p>검사와 관련된 모든 호출은 실패해도 대화를 끊지 않아야 한다.
 */
public interface IRecallService {
    // ================= 키워드 저장소 =================

    /** 어르신의 키워드 목록. 열람 권한은 호출자(컨트롤러)가 canView로 먼저 확인한다. */
    List<RecallDTO> getKeywords(String userId) throws Exception;

    /**
     * 키워드를 하나 등록한다.
     *
     * @param pDTO     userId(어르신), term, answer, category, hint
     * @param editorId 실제로 등록하는 사람. 어르신 본인이거나 연결된 보호자
     * @throws IllegalAccessException editorId가 그 어르신의 키워드를 만질 수 없을 때
     */
    RecallDTO addKeyword(RecallDTO pDTO, String editorId) throws Exception;

    /** 온 필드만 바꾼다. 권한이 없거나 바꿀 것이 없으면 0. */
    int updateKeyword(RecallDTO pDTO, String editorId) throws Exception;

    int deleteKeyword(String keywordId, String editorId) throws Exception;

    /**
     * 데일리노트를 읽어 키워드 후보를 제안한다.
     *
     * @throws IllegalStateException       노트가 모자랄 때("NOT_ENOUGH_SOURCE")
     * @throws ServiceUnavailableException 모델이 설정되지 않았을 때
     */
    List<RecallDTO> suggest(String userId) throws Exception;

    // ================= 대화 중의 검사 =================

    /**
     * 이번 응답에 얹을 이야깃거리 하나. 물으면 안 되는 상황이면 null이고,
     * 그때 대화 프롬프트는 평소와 완전히 같아진다.
     *
     * @param turnCount 지금까지 오간 메시지 수. 대화를 검사로 열지 않기 위한 것
     */
    RecallDTO pickTarget(String userId, int turnCount);

    /**
     * 모델이 실제로 여쭈었으면 검사 한 건을 연다. 응답에 그 말이 없으면 아무것도 하지 않는다 —
     * 모델은 여쭙지 않을 자유가 있고, 안 물어본 것을 물어본 것으로 세면 안 된다.
     */
    void noteAsked(String userId, String roomId, RecallDTO keyword,
                   String botMessageId, String botMessage);

    /**
     * 대화의 시스템 프롬프트 뒤에 덧붙일 블록.
     *
     * <p>{@code target}이 null이면 빈 문자열이다. 키워드를 하나도 등록하지 않은 사람의
     * 대화가 이 기능 때문에 달라지는 일은 없어야 한다.
     */
    String askBlock(RecallDTO target);

    /**
     * 이 방에서 답을 기다리는 검사가 있으면 방금 들어온 발화로 채점한다. 없으면 아무 일도
     * 하지 않고, 모델을 부르지도 않는다.
     */
    void gradeIfPending(String userId, String roomId, String userMessageId, String userMessage);

    // ================= 리포트 =================

    /** 건강 리포트가 읽는 집계. period는 WEEK | MONTH | QUARTER, 모르는 값은 WEEK. */
    RecallDTO.ReportDTO getReport(String userId, String period) throws Exception;
}
