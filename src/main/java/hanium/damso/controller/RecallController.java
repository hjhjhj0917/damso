package hanium.damso.controller;

import hanium.damso.dto.RecallDTO;
import hanium.damso.dto.ResultDTO;
import hanium.damso.service.ILinkService;
import hanium.damso.service.IRecallService;
import hanium.damso.service.ServiceUnavailableException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 기억 회상 확인 — 키워드 저장소와 건강 리포트의 집계.
 *
 * <p>권한 구조는 데일리노트와 같다: 어르신 본인과 연결된 보호자가 함께 본다. 다만
 * 노트와 달리 보호자도 쓸 수 있다.
 */
@Slf4j
@RequestMapping(value = "/api/recall")
@RequiredArgsConstructor
@RestController
public class RecallController {
    private final IRecallService recallService;
    private final ILinkService linkService;

    /**
     * 누구의 키워드를 다루는 요청인가. 권한이 없으면 null.
     *
     * <p>{@code userId}가 없으면 세션 본인이다. 보호자는 피보호인의 아이디를 실어 보낸다.
     */
    private String subject(HttpServletRequest request, String sessionUserId) {
        String userId = request.getParameter("userId");
        if (userId == null || userId.isBlank()) userId = sessionUserId;

        return linkService.canView(userId, sessionUserId) ? userId : null;
    }

    @GetMapping(value = "keywords")
    public ResultDTO<List<RecallDTO>> keywords(HttpServletRequest request, HttpSession session) {
        String sessionUserId = (String) session.getAttribute("SESSION_USER_ID");
        if (sessionUserId == null) return ResultDTO.error("INVALID_ACCESS");

        String userId = this.subject(request, sessionUserId);
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        try {
            return ResultDTO.success("QUERY_COMPLETE", recallService.getKeywords(userId));
        } catch (Exception e) {
            log.warn("recall keywords failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "keyword/create")
    public ResultDTO<RecallDTO> create(HttpServletRequest request, HttpSession session) {
        String sessionUserId = (String) session.getAttribute("SESSION_USER_ID");
        if (sessionUserId == null) return ResultDTO.error("INVALID_ACCESS");

        String userId = this.subject(request, sessionUserId);
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String term = request.getParameter("term");
        String answer = request.getParameter("answer");
        if (term == null || answer == null) return ResultDTO.error("MISSING_PARAMETER");

        RecallDTO pDTO = new RecallDTO();
        pDTO.setUserId(userId);
        pDTO.setTerm(term);
        pDTO.setAnswer(answer);
        pDTO.setHint(request.getParameter("hint"));
        pDTO.setCategory(RecallDTO.Category.of(request.getParameter("category")));

        try {
            return ResultDTO.success("CREATE_COMPLETE", recallService.addKeyword(pDTO, sessionUserId));
        } catch (NullPointerException e) {
            return ResultDTO.error("MISSING_PARAMETER");
        } catch (IllegalArgumentException e) {
            return ResultDTO.error("INVALID_PARAMETER");
        } catch (IllegalAccessException e) {
            return ResultDTO.error("INVALID_ACCESS");
        } catch (Exception e) {
            log.warn("recall keyword create failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "keyword/update")
    public ResultDTO<Void> update(HttpServletRequest request, HttpSession session) {
        String sessionUserId = (String) session.getAttribute("SESSION_USER_ID");
        if (sessionUserId == null) return ResultDTO.error("INVALID_ACCESS");

        String keywordId = request.getParameter("keywordId");
        if (keywordId == null) return ResultDTO.error("MISSING_PARAMETER");

        // 소유자는 저장된 행에서 읽는다. 요청이 말하는 userId는 여기서 쓰지 않는다 —
        // 그것을 믿으면 남의 키워드를 자기 것이라고 주장해 고칠 수 있게 된다.
        RecallDTO pDTO = RecallDTO.of(keywordId);
        pDTO.setTerm(request.getParameter("term"));
        pDTO.setAnswer(request.getParameter("answer"));
        pDTO.setHint(request.getParameter("hint"));

        String category = request.getParameter("category");
        if (category != null) pDTO.setCategory(RecallDTO.Category.of(category));

        try {
            if (recallService.updateKeyword(pDTO, sessionUserId) != 1) return ResultDTO.error("NOT_FOUND");

            return ResultDTO.success("UPDATE_COMPLETE");
        } catch (NullPointerException e) {
            return ResultDTO.error("MISSING_PARAMETER");
        } catch (IllegalArgumentException e) {
            return ResultDTO.error("INVALID_PARAMETER");
        } catch (IllegalAccessException e) {
            return ResultDTO.error("INVALID_ACCESS");
        } catch (Exception e) {
            log.warn("recall keyword update failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "keyword/delete")
    public ResultDTO<Void> delete(HttpServletRequest request, HttpSession session) {
        String sessionUserId = (String) session.getAttribute("SESSION_USER_ID");
        if (sessionUserId == null) return ResultDTO.error("INVALID_ACCESS");

        String keywordId = request.getParameter("keywordId");
        if (keywordId == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            if (recallService.deleteKeyword(keywordId, sessionUserId) != 1)
                return ResultDTO.error("NOT_FOUND");

            return ResultDTO.success("DELETE_COMPLETE");
        } catch (IllegalAccessException e) {
            return ResultDTO.error("INVALID_ACCESS");
        } catch (Exception e) {
            log.warn("recall keyword delete failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "keyword/suggest")
    public ResultDTO<List<RecallDTO>> suggest(HttpServletRequest request, HttpSession session) {
        String sessionUserId = (String) session.getAttribute("SESSION_USER_ID");
        if (sessionUserId == null) return ResultDTO.error("INVALID_ACCESS");

        String userId = this.subject(request, sessionUserId);
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        try {
            return ResultDTO.success("QUERY_COMPLETE", recallService.suggest(userId));
        } catch (IllegalStateException e) {
            return ResultDTO.error("NOT_ENOUGH_SOURCE");
        } catch (ServiceUnavailableException e) {
            log.warn("LLM not available: {}", e.getMessage());
            return ResultDTO.error("NOT_AVAILABLE");
        } catch (Exception e) {
            log.warn("recall keyword suggest failed", e);
            return ResultDTO.error("GENERATION_FAILED");
        }
    }

    @GetMapping(value = "report")
    public ResultDTO<RecallDTO.ReportDTO> report(HttpServletRequest request, HttpSession session) {
        String sessionUserId = (String) session.getAttribute("SESSION_USER_ID");
        if (sessionUserId == null) return ResultDTO.error("INVALID_ACCESS");

        String userId = this.subject(request, sessionUserId);
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        try {
            return ResultDTO.success("QUERY_COMPLETE",
                    recallService.getReport(userId, request.getParameter("period")));
        } catch (Exception e) {
            log.warn("recall report failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }
}
