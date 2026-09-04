package hanium.damso.controller;

import hanium.damso.dto.AutobiographyDTO;
import hanium.damso.dto.ResultDTO;
import hanium.damso.service.IAutobiographyService;
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

import java.util.List;

@Slf4j
@RequestMapping(value = "/api/autobiography")
@RequiredArgsConstructor
@RestController
public class AutobiographyController {
    private final IAutobiographyService autobiographyService;
    private final ILinkService linkService;

    @GetMapping(value = "list")
    public ResultDTO<List<AutobiographyDTO>> list(HttpServletRequest request, HttpSession session) {
        String sessionUserId = (String) session.getAttribute("SESSION_USER_ID");
        if (sessionUserId == null) return ResultDTO.error("INVALID_ACCESS");

        String userId = request.getParameter("userId");
        if (userId == null) userId = sessionUserId;

        if (!linkService.canView(userId, sessionUserId)) return ResultDTO.error("INVALID_ACCESS");

        try {
            return ResultDTO.success("QUERY_COMPLETE", autobiographyService.getList(userId));
        } catch (Exception e) {
            log.warn("autobiography list failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @GetMapping(value = "info")
    public ResultDTO<AutobiographyDTO> info(HttpServletRequest request, HttpSession session) {
        String sessionUserId = (String) session.getAttribute("SESSION_USER_ID");
        if (sessionUserId == null) return ResultDTO.error("INVALID_ACCESS");

        String autobiographyId = request.getParameter("autobiographyId");
        if (autobiographyId == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            AutobiographyDTO rDTO = autobiographyService.getInfo(autobiographyId);
            if (rDTO == null) return ResultDTO.error("NOT_FOUND");
            if (!linkService.canView(rDTO.getUserId(), sessionUserId))
                return ResultDTO.error("INVALID_ACCESS");

            return ResultDTO.success("QUERY_COMPLETE", rDTO);
        } catch (Exception e) {
            log.warn("autobiography info failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "create")
    public ResultDTO<AutobiographyDTO> create(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        AutobiographyDTO pDTO = new AutobiographyDTO();
        pDTO.setUserId(userId);
        pDTO.setTitle(request.getParameter("title"));
        pDTO.setContent(request.getParameter("content"));
        pDTO.setPeriod(request.getParameter("period"));
        pDTO.setSummary(request.getParameter("summary"));

        if (pDTO.getTitle() == null || pDTO.getContent() == null)
            return ResultDTO.error("MISSING_PARAMETER");

        String status = request.getParameter("status");
        if (status != null) pDTO.setStatus(AutobiographyDTO.Status.of(status));

        try {
            return ResultDTO.success("CREATE_COMPLETE", autobiographyService.create(pDTO));
        } catch (IllegalArgumentException e) {
            return ResultDTO.error("INVALID_PARAMETER");
        } catch (NullPointerException e) {
            return ResultDTO.error("MISSING_PARAMETER");
        } catch (Exception e) {
            log.warn("autobiography create failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "update")
    public ResultDTO<Void> update(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String autobiographyId = request.getParameter("autobiographyId");
        if (autobiographyId == null) return ResultDTO.error("MISSING_PARAMETER");

        AutobiographyDTO pDTO = AutobiographyDTO.of(autobiographyId);
        pDTO.setUserId(userId);
        pDTO.setTitle(request.getParameter("title"));
        pDTO.setContent(request.getParameter("content"));
        pDTO.setPeriod(request.getParameter("period"));
        pDTO.setSummary(request.getParameter("summary"));

        // 안 온 값을 기본값으로 채우지 않는다. Status.of(null)은 DRAFT를 돌려주므로 그대로 쓰면
        // 제목만 고치는 요청이 완성된 장을 작성 중으로 되돌린다.
        String status = request.getParameter("status");
        if (status != null) pDTO.setStatus(AutobiographyDTO.Status.of(status));

        try {
            if (autobiographyService.update(pDTO) != 1) return ResultDTO.error("NOT_FOUND");

            return ResultDTO.success("UPDATE_COMPLETE");
        } catch (NullPointerException e) {
            return ResultDTO.error("MISSING_PARAMETER");
        } catch (Exception e) {
            log.warn("autobiography update failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "delete")
    public ResultDTO<Void> delete(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String autobiographyId = request.getParameter("autobiographyId");
        if (autobiographyId == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            if (autobiographyService.delete(autobiographyId, userId) != 1)
                return ResultDTO.error("NOT_FOUND");

            return ResultDTO.success("DELETE_COMPLETE");
        } catch (Exception e) {
            log.warn("autobiography delete failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    /**
     * 쌓인 일기로 새 장을 쓴다. 프론트의 "✦ 새 이야기 만들기" 버튼.
     *
     * 본인만 부를 수 있다. 보호자가 남의 인생 이야기를 대신 생성하게 두지 않는다.
     */
    @PostMapping(value = "generate")
    public ResultDTO<AutobiographyDTO> generate(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        try {
            AutobiographyDTO rDTO = autobiographyService.generate(userId, request.getParameter("period"));
            // 여기 오는 null은 "모델이 쓸 만한 답을 못 줬다"뿐이다. 재료 부족은 예외로 갈린다.
            if (rDTO == null) return ResultDTO.error("GENERATION_FAILED");

            return ResultDTO.success("GENERATE_COMPLETE", rDTO);
        } catch (IllegalStateException e) {
            return ResultDTO.error("NOT_ENOUGH_SOURCE");
        } catch (ServiceUnavailableException e) {
            log.warn("LLM not available: {}", e.getMessage());
            return ResultDTO.error("NOT_AVAILABLE");
        } catch (Exception e) {
            log.warn("autobiography generate failed", e);
            return ResultDTO.error("GENERATION_FAILED");
        }
    }
}
