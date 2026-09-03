package hanium.damso.controller;

import hanium.damso.dto.NoticeDTO;
import hanium.damso.dto.ResultDTO;
import hanium.damso.service.INoticeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 공지사항.
 *
 * <p>다른 컨트롤러와 달리 소유자 확인이 없다 — 공지는 모두에게 같은 글이다. 그래도 세션은
 * 본다. 이 목록을 그리는 화면이 로그인 뒤의 대시보드 하나뿐이라, 열어 둘 이유가 없다.
 */
@Slf4j
@RequestMapping(value = "/api/notice")
@RequiredArgsConstructor
@RestController
public class NoticeController {
    private final INoticeService noticeService;

    @GetMapping(value = "list")
    public ResultDTO<List<NoticeDTO>> list(HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        try {
            return ResultDTO.success("QUERY_COMPLETE", noticeService.getList());
        } catch (Exception e) {
            log.warn("notice list failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @GetMapping(value = "info")
    public ResultDTO<NoticeDTO> info(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String noticeId = request.getParameter("noticeId");
        if (noticeId == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            NoticeDTO rDTO = noticeService.getInfo(noticeId);
            if (rDTO == null) return ResultDTO.error("NOT_FOUND");

            return ResultDTO.success("QUERY_COMPLETE", rDTO);
        } catch (Exception e) {
            log.warn("notice info failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }
}
