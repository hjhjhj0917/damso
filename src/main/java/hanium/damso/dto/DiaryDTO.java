package hanium.damso.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.util.List;

/**
 * DIARY 한 행. 프론트의 {@code DailyNote}에 대응한다.
 */
@Getter
@Setter
@ToString
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DiaryDTO {
    private String id;

    /** CONTENT_MASTER의 키. 소유권과 삭제 여부가 거기 있으므로 갱신·삭제 경로가 이걸 쓴다. */
    private String contentId;

    /** CONTENT_MASTER.USER_ID. 조회 전용 — 쓰기는 세션에서 온 값으로만 한다. */
    private String userId;

    /**
     * 일기가 다루는 날짜 YYYY-MM-DD.
     *
     * <p>{@code createdAt}(쓴 시각)과 다른 질문이다. 어제 일을 오늘 쓰는 일이 흔하고, 대화에서
     * 자동 생성할 때는 반드시 대화가 오간 날이어야 한다.
     */
    private String date;

    private String title;
    private String content;

    /** 프론트 DailyNote.mood. 화면 카피라서 DB에 CHECK가 없고 여기도 열거형이 아니다. */
    private String mood;

    /** 프론트 DailyNote.health. 한 줄짜리 자유 문자열. */
    private String health;

    /** DIARY_TAG를 순서대로. null은 "건드리지 말라", 빈 리스트는 "전부 지워라"를 뜻한다. */
    private List<String> tags;

    private Long createdAt;
    private Long updatedAt;

    /** 목록 화면이 쓰는 댓글 개수. 상세 조회에서는 comments가 채워진다. */
    private Integer commentCount;

    private List<CommentDTO> comments;

    public static DiaryDTO of(String id) {
        DiaryDTO result = new DiaryDTO();
        result.setId(id);
        return result;
    }

    /**
     * DIARY_COMMENT 한 행.
     *
     * <p>작성자는 <b>연결된 보호자만</b>이다(일기 주인 본인은 쓸 수 없다). 그래서 authorId는 절대
     * 요청 파라미터로 받지 않고 세션에서 채운다 — 받는 순간 그 규칙이 사라진다.
     */
    @Getter
    @Setter
    @ToString
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class CommentDTO {
        private String id;
        private String diaryId;
        private String authorId;

        private String authorName;

        private UserDTO.Role authorRoles;
        private String content;
        private Long createdAt;
        private Long updatedAt;
    }
}
