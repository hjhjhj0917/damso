package hanium.damso.controller;

import hanium.damso.dto.DiaryDTO;
import hanium.damso.dto.ResultDTO;
import hanium.damso.service.IDiaryService;
import hanium.damso.service.ILinkService;
import hanium.damso.service.ServiceUnavailableException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

/**
 * 데일리노트(일기).
 *
 * <p>읽기와 쓰기의 권한이 다르다. <b>읽기는 본인과 연결된 보호자</b>, <b>쓰기는 본인만</b>이다.
 * 보호자는 어르신의 하루를 볼 수 있지만 대신 써 줄 수는 없다 — 그 기록은 어르신의 것이다.
 */
@Slf4j
@RequestMapping(value = "/api/diary")
@RequiredArgsConstructor
@RestController
public class DiaryController {
    private final IDiaryService diaryService;
    private final ILinkService linkService;

    private static final Pattern DATE_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");

    @GetMapping(value = "list")
    public ResultDTO<List<DiaryDTO>> list(HttpServletRequest request, HttpSession session) {
        String sessionUserId = (String) session.getAttribute("SESSION_USER_ID");
        if (sessionUserId == null) return ResultDTO.error("INVALID_ACCESS");

        String userId = request.getParameter("userId");
        if (userId == null) userId = sessionUserId;

        if (!linkService.canView(userId, sessionUserId)) return ResultDTO.error("INVALID_ACCESS");

        try {
            return ResultDTO.success("QUERY_COMPLETE", diaryService.getList(userId));
        } catch (Exception e) {
            log.warn("diary list failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @GetMapping(value = "info")
    public ResultDTO<DiaryDTO> info(HttpServletRequest request, HttpSession session) {
        String sessionUserId = (String) session.getAttribute("SESSION_USER_ID");
        if (sessionUserId == null) return ResultDTO.error("INVALID_ACCESS");

        String diaryId = request.getParameter("diaryId");
        if (diaryId == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            DiaryDTO rDTO = diaryService.getInfo(diaryId);
            if (rDTO == null) return ResultDTO.error("NOT_FOUND");

            if (!linkService.canView(rDTO.getUserId(), sessionUserId))
                return ResultDTO.error("INVALID_ACCESS");

            rDTO.setComments(diaryService.getComments(diaryId));

            return ResultDTO.success("QUERY_COMPLETE", rDTO);
        } catch (Exception e) {
            log.warn("diary info failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "create")
    public ResultDTO<DiaryDTO> create(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        DiaryDTO pDTO = new DiaryDTO();
        pDTO.setUserId(userId);
        pDTO.setTitle(request.getParameter("title"));
        pDTO.setContent(request.getParameter("content"));

        if (pDTO.getTitle() == null || pDTO.getContent() == null)
            return ResultDTO.error("MISSING_PARAMETER");
        if (!this.applyOptionalFields(pDTO, request)) return ResultDTO.error("INVALID_PARAMETER");

        try {
            return ResultDTO.success("CREATE_COMPLETE", diaryService.create(pDTO));
        } catch (IllegalArgumentException e) {
            return ResultDTO.error("INVALID_PARAMETER");
        } catch (NullPointerException e) {
            return ResultDTO.error("MISSING_PARAMETER");
        } catch (Exception e) {
            log.warn("diary create failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "update")
    public ResultDTO<Void> update(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String diaryId = request.getParameter("diaryId");
        if (diaryId == null) return ResultDTO.error("MISSING_PARAMETER");

        DiaryDTO pDTO = DiaryDTO.of(diaryId);
        pDTO.setUserId(userId);
        pDTO.setTitle(request.getParameter("title"));
        pDTO.setContent(request.getParameter("content"));
        if (!this.applyOptionalFields(pDTO, request)) return ResultDTO.error("INVALID_PARAMETER");

        try {
            if (diaryService.update(pDTO) != 1) return ResultDTO.error("NOT_FOUND");

            return ResultDTO.success("UPDATE_COMPLETE");
        } catch (NullPointerException e) {
            return ResultDTO.error("MISSING_PARAMETER");
        } catch (Exception e) {
            log.warn("diary update failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "delete")
    public ResultDTO<Void> delete(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String diaryId = request.getParameter("diaryId");
        if (diaryId == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            if (diaryService.delete(diaryId, userId) != 1) return ResultDTO.error("NOT_FOUND");

            return ResultDTO.success("DELETE_COMPLETE");
        } catch (Exception e) {
            log.warn("diary delete failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    /**
     * 그날 대화를 데일리노트로 정리한다. 프론트 ChatView의 "대화 내용 노트 정리" 버튼.
     *
     * <p>본인만 부를 수 있다. 대화는 보호자에게 열리지 않으므로, 그것을 재료로 쓰는 이 기능도
     * 열릴 수 없다.
     */
    @PostMapping(value = "generate")
    public ResultDTO<DiaryDTO> generate(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String date = request.getParameter("diaryDate");
        if (date == null) return ResultDTO.error("MISSING_PARAMETER");
        if (!DATE_PATTERN.matcher(date).matches()) return ResultDTO.error("INVALID_PARAMETER");

        try {
            DiaryDTO rDTO = diaryService.generate(userId, date, request.getParameter("roomId"));
            if (rDTO == null) return ResultDTO.error("GENERATION_FAILED");

            return ResultDTO.success("GENERATE_COMPLETE", rDTO);
        } catch (IllegalStateException e) {
            return ResultDTO.error("NOT_ENOUGH_SOURCE");
        } catch (ServiceUnavailableException e) {
            log.warn("LLM not available: {}", e.getMessage());
            return ResultDTO.error("NOT_AVAILABLE");
        } catch (Exception e) {
            log.warn("diary generate failed", e);
            return ResultDTO.error("GENERATION_FAILED");
        }
    }

    // ================= 댓글 =================
    //
    // 읽기와 쓰기의 주체가 일기 본문과 정반대다. 목록은 주인과 보호자 모두 읽지만,
    // 쓰기·수정·삭제는 연결된 보호자만이다(주인은 자기 댓글을 남길 수 없다).

    @GetMapping(value = "comment/list")
    public ResultDTO<List<DiaryDTO.CommentDTO>> commentList(HttpServletRequest request, HttpSession session) {
        String sessionUserId = (String) session.getAttribute("SESSION_USER_ID");
        if (sessionUserId == null) return ResultDTO.error("INVALID_ACCESS");

        String diaryId = request.getParameter("diaryId");
        if (diaryId == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            DiaryDTO diary = diaryService.getInfo(diaryId);
            if (diary == null) return ResultDTO.error("NOT_FOUND");

            // 읽기는 canView다. 주인이 자기 일기에 달린 답글을 못 읽게 하는 것은 다른, 더 나쁜 제품이다.
            if (!linkService.canView(diary.getUserId(), sessionUserId))
                return ResultDTO.error("INVALID_ACCESS");

            return ResultDTO.success("QUERY_COMPLETE", diaryService.getComments(diaryId));
        } catch (Exception e) {
            log.warn("comment list failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "comment/create")
    public ResultDTO<DiaryDTO.CommentDTO> commentCreate(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String diaryId = request.getParameter("diaryId");
        String content = request.getParameter("content");
        if (diaryId == null || content == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            DiaryDTO.CommentDTO rDTO = diaryService.addComment(diaryId, userId, content);
            if (rDTO == null) return ResultDTO.error("NOT_FOUND");

            return ResultDTO.success("CREATE_COMPLETE", rDTO);
        } catch (IllegalAccessException e) {
            // 연결된 보호자가 아니거나, 자기 일기다. 어느 쪽인지 구분해 주지 않는다 —
            // 구분해 주면 남의 일기 ID를 넣어 보며 연결 관계를 알아낼 수 있다.
            return ResultDTO.error("INVALID_ACCESS");
        } catch (IllegalArgumentException e) {
            return ResultDTO.error("INVALID_PARAMETER");
        } catch (Exception e) {
            log.warn("comment create failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "comment/update")
    public ResultDTO<Void> commentUpdate(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String commentId = request.getParameter("commentId");
        String content = request.getParameter("content");
        if (commentId == null || content == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            if (diaryService.updateComment(commentId, userId, content) != 1)
                return ResultDTO.error("INVALID_ACCESS");

            return ResultDTO.success("UPDATE_COMPLETE");
        } catch (IllegalArgumentException e) {
            return ResultDTO.error("INVALID_PARAMETER");
        } catch (Exception e) {
            log.warn("comment update failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "comment/delete")
    public ResultDTO<Void> commentDelete(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String commentId = request.getParameter("commentId");
        if (commentId == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            if (diaryService.deleteComment(commentId, userId) != 1)
                return ResultDTO.error("INVALID_ACCESS");

            return ResultDTO.success("DELETE_COMPLETE");
        } catch (Exception e) {
            log.warn("comment delete failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    /**
     * 선택 항목을 옮겨 담는다. 형식이 틀리면 false.
     *
     * <p>{@code tags}는 쉼표로 이어진 한 줄로 온다. 파라미터 자체가 없으면 손대지 않고(null),
     * 빈 문자열로 오면 빈 리스트가 되어 전부 지운다.
     */
    private boolean applyOptionalFields(DiaryDTO pDTO, HttpServletRequest request) {
        String date = request.getParameter("diaryDate");
        if (date != null) {
            if (!DATE_PATTERN.matcher(date).matches()) return false;
            pDTO.setDate(date);
        }

        pDTO.setMood(request.getParameter("mood"));
        pDTO.setHealth(request.getParameter("health"));

        String tags = request.getParameter("tags");
        if (tags != null) {
            pDTO.setTags(Arrays.stream(tags.split(","))
                    .map(String::trim)
                    .filter(tag -> !tag.isEmpty())
                    .toList());
        }

        return true;
    }
}
