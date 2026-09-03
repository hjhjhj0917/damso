package hanium.damso.controller;

import hanium.damso.dto.LinkDTO;
import hanium.damso.dto.ResultDTO;
import hanium.damso.dto.UserDTO;
import hanium.damso.service.ILinkService;
import hanium.damso.service.IUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.regex.Pattern;

/**
 * 보호자-피보호인 연결.
 */
@Slf4j
@RequestMapping(value = "/api/link")
@RequiredArgsConstructor
@RestController
public class LinkController {
    private final ILinkService linkService;
    private final IUserService userService;

    /** 프론트 ParentLinkModal의 검증식과 같은 규칙. 서버에서도 다시 본다. */
    private static final Pattern RESIDENT_FRONT_PATTERN = Pattern.compile("^\\d{6}$");
    private static final Pattern RESIDENT_BACK_PATTERN = Pattern.compile("^[1-4]$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^01[016789]\\d{7,8}$");

    private static String normalizePhone(String value) {
        return value == null ? null : value.replaceAll("\\D", "");
    }

    /**
     * 세션이 보호자 계정인지 본다.
     *
     * <p>SESSION_USER_ROLES가 아니라 USER_INFO를 다시 읽는다. 세션 속성은 로그인 시점의 사본이라
     * 그 뒤에 역할이 바뀌어도 그대로 남고, 그러면 세션은 잃은 권한을 계속 내준다. 메뉴를 그리는
     * 데는 사본으로 충분하지만 인가는 아니다.
     */
    private boolean isGuardian(String userId) {
        try {
            UserDTO user = userService.getInfo(userId);
            return user != null && user.getRoles() == UserDTO.Role.GUARDIAN;
        } catch (Exception e) {
            log.warn("Role lookup failed for {} - denying", userId, e);
            return false;
        }
    }

    /**
     * 내 연결 목록. 보호자면 피보호인들이, 어르신이면 보호자들이 돌아온다.
     *
     * <p>엔드포인트를 둘로 나누지 않은 이유: 호출하는 화면(마이페이지)이 하나이고, 자기가 어느
     * 쪽인지는 이미 알고 있다. 나누면 프론트가 역할을 보고 분기해야 한다.
     */
    @GetMapping(value = "list")
    public ResultDTO<List<LinkDTO>> list(HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        try {
            List<LinkDTO> links = this.isGuardian(userId)
                    ? linkService.getWards(userId)
                    : linkService.getGuardians(userId);

            return ResultDTO.success("QUERY_COMPLETE", links);
        } catch (Exception e) {
            log.warn("link list failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    /**
     * 대조만 해 본다. 연결은 만들지 않는다.
     *
     * <p>동의 체크박스를 누르기 전에 "일치하는 계정이 없습니다"를 말할 수 있게 하려고 있다.
     * 응답에 wardId를 담지 않는 것이 이 엔드포인트의 전제다 — 담으면 이름과 전화번호를 바꿔 가며
     * 계정 식별자를 캐낼 수 있는 창구가 된다.
     */
    @PostMapping(value = "verify")
    public ResultDTO<LinkDTO> verify(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");
        if (!this.isGuardian(userId)) return ResultDTO.error("INVALID_ACCESS");

        String name = request.getParameter("name");
        String residentFront = request.getParameter("residentFront");
        String residentBackFirst = request.getParameter("residentBackFirst");
        String phone = normalizePhone(request.getParameter("phone"));

        String invalid = validate(name, residentFront, residentBackFirst, phone);
        if (invalid != null) return ResultDTO.error(invalid);

        try {
            LinkDTO ward = linkService.verify(name, residentFront, residentBackFirst, phone);
            if (ward == null) return ResultDTO.error("USER_NOT_FOUND");

            return ResultDTO.success("QUERY_COMPLETE", ward);
        } catch (Exception e) {
            log.warn("link verify failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    /**
     * 연결을 만든다.
     *
     * <p>consent가 참이 아니면 아무 일도 하지 않는다. 그 체크박스가 이 행의 법적 근거이고,
     * USER_LINK.CONSENT_AT은 동의 없이 만들어진 행이 없다는 것을 증명하려고 있는 컬럼이다.
     */
    @PostMapping(value = "create")
    public ResultDTO<LinkDTO> create(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");
        if (!this.isGuardian(userId)) return ResultDTO.error("INVALID_ACCESS");

        String name = request.getParameter("name");
        String residentFront = request.getParameter("residentFront");
        String residentBackFirst = request.getParameter("residentBackFirst");
        String phone = normalizePhone(request.getParameter("phone"));
        String relation = request.getParameter("relation");

        String invalid = validate(name, residentFront, residentBackFirst, phone);
        if (invalid != null) return ResultDTO.error(invalid);

        if (!Boolean.parseBoolean(request.getParameter("consent")))
            return ResultDTO.error("CONSENT_REQUIRED");

        try {
            LinkDTO rDTO = linkService.link(userId, name, residentFront, residentBackFirst, phone, relation);
            if (rDTO == null) return ResultDTO.error("USER_NOT_FOUND");

            return ResultDTO.success("CREATE_COMPLETE", rDTO);
        } catch (IllegalStateException e) {
            return ResultDTO.error("ALREADY_LINKED");
        } catch (IllegalArgumentException e) {
            return ResultDTO.error("INVALID_PARAMETER");
        } catch (Exception e) {
            log.warn("link create failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    /**
     * 연결 해제. 보호자는 wardId를, 어르신은 guardianId를 보낸다.
     *
     * <p>어느 쪽이든 상대 동의 없이 끊을 수 있다.
     */
    @PostMapping(value = "delete")
    public ResultDTO<Void> delete(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String wardId = request.getParameter("wardId");
        String guardianId = request.getParameter("guardianId");

        if ((wardId == null) == (guardianId == null)) return ResultDTO.error("MISSING_PARAMETER");

        String guardian = wardId != null ? userId : guardianId;
        String ward = wardId != null ? wardId : userId;

        try {
            int result = linkService.unlink(guardian, ward);
            if (result != 1) return ResultDTO.error("NOT_FOUND");

            return ResultDTO.success("DELETE_COMPLETE");
        } catch (Exception e) {
            log.warn("link delete failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    /** 형식 검사만. 통과하면 null, 아니면 응답에 실을 코드. */
    private static String validate(String name, String residentFront, String residentBackFirst, String phone) {
        if (name == null || residentFront == null || residentBackFirst == null || phone == null)
            return "MISSING_PARAMETER";
        if (name.trim().length() < 2) return "INVALID_NAME";
        if (!RESIDENT_FRONT_PATTERN.matcher(residentFront).matches()) return "INVALID_PARAMETER";
        if (!RESIDENT_BACK_PATTERN.matcher(residentBackFirst).matches()) return "INVALID_PARAMETER";
        if (!PHONE_PATTERN.matcher(phone).matches()) return "INVALID_PHONE";

        return null;
    }
}
