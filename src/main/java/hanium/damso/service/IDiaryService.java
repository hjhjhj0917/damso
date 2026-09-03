package hanium.damso.service;

import hanium.damso.dto.DiaryDTO;

import java.util.List;

public interface IDiaryService {
    List<DiaryDTO> getList(String userId) throws Exception;

    DiaryDTO getInfo(String diaryId) throws Exception;

    /** 그날의 일기. 없으면 null. */
    DiaryDTO getByDate(String userId, String date) throws Exception;

    /** 만들어진 일기를 돌려준다 — 프론트가 목록을 다시 부르지 않아도 되게. */
    DiaryDTO create(DiaryDTO pDTO) throws Exception;

    /** 주인이 아니면 0. 고칠 것이 하나도 없어도 0. */
    int update(DiaryDTO pDTO) throws Exception;

    int delete(String diaryId, String userId) throws Exception;

    /**
     * 그날의 대화를 읽어 데일리노트 한 편을 쓰고 저장한다. 프론트의 "대화 내용 노트 정리" 버튼.
     *
     * @param roomId 특정 대화방으로 좁히려면. null이면 그날의 모든 방
     * @return 저장된 일기. 모델이 쓸 만한 답을 못 주면 null
     * @throws IllegalStateException       그날 대화가 모자랄 때("NOT_ENOUGH_SOURCE")
     * @throws ServiceUnavailableException 모델이 설정되지 않았을 때
     */
    DiaryDTO generate(String userId, String date, String roomId) throws Exception;

    // ================= 댓글 =================
    //
    // 권한이 일기 본문과 정반대다. 본문은 주인만 쓰고 보호자는 읽기만 하는데, 댓글은
    // 연결된 보호자만 쓰고 주인은 읽기만 한다. 이 규칙이 컨트롤러 네 곳에 흩어지지 않도록
    // 여기(서비스)에서 판정한다.

    List<DiaryDTO.CommentDTO> getComments(String diaryId) throws Exception;

    /** 권한이 없으면 IllegalAccessException. 일기가 없으면 null. */
    DiaryDTO.CommentDTO addComment(String diaryId, String authorId, String content) throws Exception;

    /** 작성자 본인이면서 여전히 보호자여야 한다. 아니면 0. */
    int updateComment(String commentId, String authorId, String content) throws Exception;

    /** 작성자 본인 또는 일기 주인. 아니면 0. */
    int deleteComment(String commentId, String userId) throws Exception;
}
