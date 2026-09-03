package hanium.damso.controller;

import hanium.damso.dto.InquiryDTO;
import hanium.damso.dto.ResultDTO;
import hanium.damso.dto.UserDTO;
import hanium.damso.service.IInquiryService;
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
 * 1:1 문의.
 *
 * <p>일기·일정과 권한 구조가 다르다. <b>읽기도 쓰기도 본인만</b>이고 보호자는 끼지 않는다 —
 * 결제나 개인정보처럼 본인만의 일이 이 자리로 오기 때문에, 연결됐다는 이유로 열어 줄 수 없다.
 * 답변만 운영자(ROLES=ADMIN)의 몫이다.
 */
@Slf4j
@RequestMapping(value = "/api/inquiry")
@RequiredArgsConstructor
@RestController
public class InquiryController {
    private final IInquiryService inquiryService;

    @GetMapping(value = "list")
    public ResultDTO<List<InquiryDTO>> list(HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        try {
            return ResultDTO.success("QUERY_COMPLETE", inquiryService.getList(userId));
        } catch (Exception e) {
            log.warn("inquiry list failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @GetMapping(value = "info")
    public ResultDTO<InquiryDTO> info(HttpServletRequest request, HttpSession session) {
        String sessionUserId = (String) session.getAttribute("SESSION_USER_ID");
        if (sessionUserId == null) return ResultDTO.error("INVALID_ACCESS");

        String inquiryId = request.getParameter("inquiryId");
        if (inquiryId == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            InquiryDTO rDTO = inquiryService.getInfo(inquiryId);
            if (rDTO == null) return ResultDTO.error("NOT_FOUND");

            if (!sessionUserId.equals(rDTO.getUserId()) && !this.isAdmin(session))
                return ResultDTO.error("INVALID_ACCESS");

            return ResultDTO.success("QUERY_COMPLETE", rDTO);
        } catch (Exception e) {
            log.warn("inquiry info failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "create")
    public ResultDTO<InquiryDTO> create(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        InquiryDTO pDTO = new InquiryDTO();
        pDTO.setUserId(userId);
        pDTO.setTitle(request.getParameter("title"));
        pDTO.setContent(request.getParameter("content"));

        if (pDTO.getTitle() == null || pDTO.getContent() == null)
            return ResultDTO.error("MISSING_PARAMETER");

        pDTO.setCategory(InquiryDTO.Category.of(request.getParameter("category")));

        try {
            return ResultDTO.success("CREATE_COMPLETE", inquiryService.create(pDTO));
        } catch (IllegalArgumentException e) {
            return ResultDTO.error("INVALID_PARAMETER");
        } catch (NullPointerException e) {
            return ResultDTO.error("MISSING_PARAMETER");
        } catch (Exception e) {
            log.warn("inquiry create failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    /**
     * 운영자 답변. {@code answer}와 {@code status} 중 최소 하나가 있어야 한다.
     *
     * <p>프론트에는 아직 이 화면이 없다. 그래도 엔드포인트를 둔 이유는, 답변 없이는 상태가 영영
     * 접수완료에 머물러 문의 기능이 반쪽이 되기 때문이다 — 공지와 달리 문의는 건마다 답이 붙는다.
     */
    @PostMapping(value = "answer")
    public ResultDTO<Void> answer(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");
        if (!this.isAdmin(session)) return ResultDTO.error("INVALID_ACCESS");

        String inquiryId = request.getParameter("inquiryId");
        if (inquiryId == null) return ResultDTO.error("MISSING_PARAMETER");

        InquiryDTO pDTO = InquiryDTO.of(inquiryId);
        pDTO.setAnsweredBy(userId);
        pDTO.setAnswer(request.getParameter("answer"));

        String status = request.getParameter("status");
        if (status != null) {
            // of()는 모르는 값에 null을 준다. 그대로 흘리면 "상태를 안 보냈다"와 구분되지 않아,
            // 오타 하나가 조용히 답변만 다는 요청으로 바뀐다.
            InquiryDTO.Status parsed = InquiryDTO.Status.of(status);
            if (parsed == null) return ResultDTO.error("INVALID_PARAMETER");
            pDTO.setStatus(parsed);
        }

        try {
            if (inquiryService.answer(pDTO) != 1) return ResultDTO.error("NOT_FOUND");

            return ResultDTO.success("UPDATE_COMPLETE");
        } catch (IllegalArgumentException e) {
            return ResultDTO.error("INVALID_PARAMETER");
        } catch (NullPointerException e) {
            return ResultDTO.error("MISSING_PARAMETER");
        } catch (Exception e) {
            log.warn("inquiry answer failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    private boolean isAdmin(HttpSession session) {
        return UserDTO.Role.ADMIN.name().equals(session.getAttribute("SESSION_USER_ROLES"));
    }
}
