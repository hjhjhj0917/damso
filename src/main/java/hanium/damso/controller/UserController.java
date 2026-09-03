package hanium.damso.controller;

import hanium.damso.dto.ResultDTO;
import hanium.damso.dto.UserDTO;
import hanium.damso.service.IUserService;
import hanium.damso.util.EncryptUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.regex.Pattern;

@Slf4j
@RequestMapping(value = "/api/user")
@RequiredArgsConstructor
@RestController
public class UserController {
    private final IUserService userService;
    private final EncryptUtil encryptUtil;

    /** 프론트 Signup.tsx의 USER_ID_PATTERN과 같은 규칙. 서버에서도 다시 본다. */
    private static final Pattern ID_PATTERN = Pattern.compile("^[a-zA-Z0-9_]{4,20}$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^01[016789]\\d{7,8}$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    /** 메일로 보낸 인증번호의 수명. 느린 메일을 기다릴 만큼 길고, 의미가 있을 만큼 짧게. */
    private static final long VERIFICATION_TTL_MS = 10 * 60 * 1000L;

    /** 코드 하나당 허용하는 시도 횟수. 넘으면 코드를 폐기한다. */
    private static final int VERIFICATION_MAX_ATTEMPTS = 5;

    // ================= 공통 =================

    /** 프론트 normalizeId와 같다 — 대소문자만 다른 아이디를 서로 다른 계정으로 만들지 않는다. */
    private static String normalizeId(String value) {
        return value == null ? null : value.trim().toLowerCase();
    }

    private static String normalizePhone(String value) {
        return value == null ? null : value.replaceAll("\\D", "");
    }

    private static String normalizeEmail(String value) {
        return value == null ? null : value.trim().toLowerCase();
    }

    /**
     * 메일로 보낸 코드와 입력값을 대조하고, 여섯 자리 비밀을 지킬 수 있게 하는 두 가지 제한을
     * 건다. 백만 가지는 넉넉해 보이지만 아니다 — 상한이 없으면 스크립트가 몇 분 만에 전 구간을
     * 훑고, 만료가 없으면 세션에 남은 코드가 무한정 추측 대상이 된다.
     *
     * <p>비교가 equals가 아니라 MessageDigest.isEqual인 이유는, equals가 첫 불일치에서 즉시
     * 돌아와 응답 시간으로 "몇 글자까지 맞았는지"를 흘리기 때문이다.
     *
     * @return 코드가 맞은 경우에만 true. 호출부는 false를 세 가지 이유 중 어느 것인지 밝히지 말고
     *         한 가지 거절로만 다뤄야 한다.
     */
    private boolean consumeCodeAttempt(HttpSession session, String codeKey, String expiresKey,
                                       String attemptsKey, String supplied) {
        String expected = (String) session.getAttribute(codeKey);
        if (expected == null) return false;

        Long expiresAt = (Long) session.getAttribute(expiresKey);
        if (expiresAt == null || System.currentTimeMillis() > expiresAt) {
            clearCode(session, codeKey, expiresKey, attemptsKey);
            return false;
        }

        Integer attempts = (Integer) session.getAttribute(attemptsKey);
        int used = attempts == null ? 0 : attempts;
        if (used >= VERIFICATION_MAX_ATTEMPTS) {
            clearCode(session, codeKey, expiresKey, attemptsKey);
            return false;
        }
        session.setAttribute(attemptsKey, used + 1);

        if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                                   supplied.getBytes(StandardCharsets.UTF_8))) {
            return false;
        }

        // 한 번 쓰면 끝. 제 일을 마친 코드가 재사용되면 안 된다.
        clearCode(session, codeKey, expiresKey, attemptsKey);
        return true;
    }

    private void clearCode(HttpSession session, String codeKey, String expiresKey, String attemptsKey) {
        session.removeAttribute(codeKey);
        session.removeAttribute(expiresKey);
        session.removeAttribute(attemptsKey);
    }

    // ================= 가입 =================

    @GetMapping(value = "getIdExists")
    public ResultDTO<UserDTO> getIdExists(HttpServletRequest request) throws Exception {
        String id = normalizeId(request.getParameter("id"));
        if (id == null) return ResultDTO.error("MISSING_PARAMETER");
        if (!ID_PATTERN.matcher(id).matches()) return ResultDTO.error("INVALID_PARAMETER");

        UserDTO user = userService.getIdExists(id);
        if (user == null) return ResultDTO.error("UNKNOWN_ERROR");

        return ResultDTO.success("QUERY_COMPLETE", user);
    }

    @GetMapping(value = "getEmailExists")
    public ResultDTO<UserDTO> getEmailExists(HttpServletRequest request) throws Exception {
        String email = normalizeEmail(request.getParameter("email"));
        if (email == null) return ResultDTO.error("MISSING_PARAMETER");

        UserDTO user = userService.getEmailExists(email);
        if (user == null) return ResultDTO.error("UNKNOWN_ERROR");

        return ResultDTO.success("QUERY_COMPLETE", user);
    }

    /**
     * 회원가입.
     *
     * <p>kindy와 달리 이메일 인증 단계가 없다. 그래서 이 행이 존재한다는 것이 곧 이메일이
     * 검증됐다는 뜻은 아니다 — 나중에 인증을 붙이면 그때 IS_EMAIL_VERIFIED 컬럼이 필요해진다.
     */
    @PostMapping(value = "create")
    public ResultDTO<Void> create(HttpServletRequest request) {
        String id = normalizeId(request.getParameter("id"));
        String password = request.getParameter("password");
        String name = request.getParameter("name");
        String phone = normalizePhone(request.getParameter("phone"));
        String email = normalizeEmail(request.getParameter("email"));
        String roles = request.getParameter("roles");

        if (id == null || password == null || name == null || phone == null || email == null)
            return ResultDTO.error("MISSING_PARAMETER");

        if (!ID_PATTERN.matcher(id).matches()) return ResultDTO.error("INVALID_ID");
        if (password.length() < 8) return ResultDTO.error("INVALID_PASSWORD");
        if (name.trim().length() < 2) return ResultDTO.error("INVALID_NAME");
        if (!PHONE_PATTERN.matcher(phone).matches()) return ResultDTO.error("INVALID_PHONE");
        if (!EMAIL_PATTERN.matcher(email).matches()) return ResultDTO.error("INVALID_EMAIL");

        try {
            UserDTO pDTO = new UserDTO();
            pDTO.setId(id);
            pDTO.setName(name.trim());
            byte[] salt = encryptUtil.getSecureSalt();
            pDTO.setPasswordSalt(salt);
            pDTO.setPassword(encryptUtil.encHashSHA256(password, salt));
            pDTO.setPhone(phone);
            pDTO.setEmail(email);
            // 프론트는 user/guardian 을 소문자로 보낸다. ADMIN은 가입으로 만들 수 없다.
            UserDTO.Role role = roles == null
                    ? UserDTO.Role.USER
                    : UserDTO.Role.valueOf(roles.trim().toUpperCase());
            if (role == UserDTO.Role.ADMIN) return ResultDTO.error("INVALID_ROLE");
            pDTO.setRoles(role);
            pDTO.setBirthDate(request.getParameter("birthDate"));

            int res = userService.create(pDTO);
            if (res != 1) return ResultDTO.error("UNKNOWN_ERROR");

            log.info("Signup complete: {}", id);
            return ResultDTO.success("SIGNUP_COMPLETE");
        } catch (DuplicateKeyException e) {
            // USER_ID PK와 EMAIL UNIQUE 둘 다 여기로 온다. 어느 쪽인지 다시 확인해 알려준다.
            try {
                UserDTO emailCheck = userService.getEmailExists(email);
                if (emailCheck != null && Boolean.TRUE.equals(emailCheck.getExists()))
                    return ResultDTO.error("DUPLICATE_EMAIL");
            } catch (Exception ignored) {
                // 판별에 실패하면 아이디 중복으로 답한다. 어차피 둘 중 하나다.
            }
            return ResultDTO.error("DUPLICATE_ID");
        } catch (IllegalArgumentException e) {
            return ResultDTO.error("INVALID_PARAMETER");
        } catch (NullPointerException e) {
            return ResultDTO.error("MISSING_PARAMETER");
        } catch (Exception e) {
            log.warn("create failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    // ================= 로그인 =================

    @PostMapping(value = "login")
    public ResultDTO<UserDTO.PlainUserDTO> login(HttpServletRequest request, HttpSession session) {
        String id = normalizeId(request.getParameter("id"));
        String password = request.getParameter("password");
        if (id == null || password == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            UserDTO rDTO = userService.login(id, password);
            if (rDTO == null) return ResultDTO.error("SIGNIN_NO_MATCHES");

            // 세션 고정 공격 방지 — 로그인 전에 쥐고 있던 세션 ID를 그대로 승격시키지 않는다.
            session.invalidate();
            session = request.getSession(true);
            session.setMaxInactiveInterval(3600);
            session.setAttribute("SESSION_USER_ID", rDTO.getId());
            session.setAttribute("SESSION_USER_NAME", rDTO.getName());
            session.setAttribute("SESSION_USER_ROLES", rDTO.getRoles().name());

            log.info("Login: {}", rDTO.getId());

            UserDTO full = userService.getInfo(rDTO.getId());
            return ResultDTO.success("SIGNIN_COMPLETE", UserDTO.PlainUserDTO.of(full));
        } catch (Exception e) {
            log.error("login failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @GetMapping(value = "session")
    public ResultDTO<UserDTO.PlainUserDTO> session(HttpSession session) throws Exception {
        String id = (String) session.getAttribute("SESSION_USER_ID");
        if (id == null) return ResultDTO.success("NOT_SIGNED_IN", null);

        UserDTO user = userService.getInfo(id);
        // 세션은 살아 있는데 행이 없다면 그 사이에 탈퇴한 것이다. 세션도 정리한다.
        if (user == null) {
            session.invalidate();
            return ResultDTO.success("NOT_SIGNED_IN", null);
        }

        return ResultDTO.success("SIGNED_IN", UserDTO.PlainUserDTO.of(user));
    }

    @PostMapping(value = "logout")
    public ResultDTO<Void> logout(HttpSession session) {
        // invalidate() 전에 읽는다. 지나고 나면 속성이 사라져 null이 찍힌다.
        String id = (String) session.getAttribute("SESSION_USER_ID");
        session.invalidate();
        log.info("Logout: {}", id);
        return ResultDTO.success("SIGNOUT_COMPLETE");
    }

    // ================= 마이페이지 =================

    @GetMapping(value = "info")
    public ResultDTO<UserDTO.PlainUserDTO> info(HttpSession session) throws Exception {
        String id = (String) session.getAttribute("SESSION_USER_ID");
        if (id == null) return ResultDTO.error("INVALID_ACCESS");

        UserDTO user = userService.getInfo(id);
        if (user == null) return ResultDTO.error("USER_NOT_FOUND");

        return ResultDTO.success("QUERY_COMPLETE", UserDTO.PlainUserDTO.of(user));
    }

    @PostMapping(value = "update")
    public ResultDTO<Void> update(HttpServletRequest request, HttpSession session) throws Exception {
        String id = (String) session.getAttribute("SESSION_USER_ID");
        if (id == null) return ResultDTO.error("INVALID_ACCESS");

        String name = request.getParameter("name");
        String phone = normalizePhone(request.getParameter("phone"));
        String birthDate = request.getParameter("birthDate");

        if (name == null && phone == null && birthDate == null) return ResultDTO.error("MISSING_PARAMETER");
        if (name != null && name.trim().length() < 2) return ResultDTO.error("INVALID_NAME");
        if (phone != null && !PHONE_PATTERN.matcher(phone).matches()) return ResultDTO.error("INVALID_PHONE");

        UserDTO pDTO = UserDTO.fromId(id);
        if (name != null) pDTO.setName(name.trim());
        pDTO.setPhone(phone);
        pDTO.setBirthDate(birthDate);

        if (userService.update(pDTO) != 1) return ResultDTO.error("UNKNOWN_ERROR");

        // 이름이 바뀌면 세션이 들고 있던 표시용 이름도 같이 바꿔 준다.
        if (name != null) session.setAttribute("SESSION_USER_NAME", name.trim());

        return ResultDTO.success("UPDATE_COMPLETE");
    }

    /**
     * 로그인한 사용자가 현재 비밀번호를 대고 바꾼다.
     *
     * <p>재설정 흐름을 빌려 쓰지 않는 것이 요점이다. 재설정은 메일로 신원을 증명하고, 변경은
     * 현재 비밀번호로 증명한다. 둘을 한 곳에 몰면 재설정 쪽을 강화할 때마다 설정 화면이 깨진다.
     */
    @PostMapping(value = "changePassword")
    public ResultDTO<Void> changePassword(HttpServletRequest request, HttpSession session) throws Exception {
        String id = (String) session.getAttribute("SESSION_USER_ID");
        if (id == null) return ResultDTO.error("INVALID_ACCESS");

        String currentPassword = request.getParameter("currentPassword");
        String newPassword = request.getParameter("newPassword");
        if (currentPassword == null || newPassword == null) return ResultDTO.error("MISSING_PARAMETER");
        if (newPassword.length() < 8) return ResultDTO.error("INVALID_PASSWORD");

        // "이 비밀번호가 맞는가"의 구현을 login 하나로 유지한다. 저장 방식이 바뀌어도
        // 뒤에 남은 약한 비교가 생기지 않는다.
        if (userService.login(id, currentPassword) == null) return ResultDTO.error("SIGNIN_NO_MATCHES");

        userService.updatePassword(id, newPassword);
        log.info("Password changed: {}", id);

        return ResultDTO.success("UPDATE_COMPLETE");
    }

    @PostMapping(value = "onboarding/complete")
    public ResultDTO<Void> completeOnboarding(HttpSession session) throws Exception {
        String id = (String) session.getAttribute("SESSION_USER_ID");
        if (id == null) return ResultDTO.error("INVALID_ACCESS");

        userService.completeOnboarding(id);
        return ResultDTO.success("UPDATE_COMPLETE");
    }

    /** 회원탈퇴. 행을 지우지 않고 IS_DELETED만 세운다. */
    @PostMapping(value = "withdraw")
    public ResultDTO<Void> withdraw(HttpServletRequest request, HttpSession session) throws Exception {
        String id = (String) session.getAttribute("SESSION_USER_ID");
        if (id == null) return ResultDTO.error("INVALID_ACCESS");

        String password = request.getParameter("password");
        if (password == null) return ResultDTO.error("MISSING_PARAMETER");
        if (userService.login(id, password) == null) return ResultDTO.error("SIGNIN_NO_MATCHES");

        if (userService.withdraw(id) != 1) return ResultDTO.error("UNKNOWN_ERROR");
        session.invalidate();

        log.info("Withdrawn: {}", id);
        return ResultDTO.success("WITHDRAW_COMPLETE");
    }

    // ================= 아이디 찾기 =================

    /**
     * 가입된 주소인지 확인하고 코드를 보낸다.
     *
     * <p>조회처럼 읽히지만 POST다 — 메일을 보내고 세션에 쓰기 때문이다. HTTP 메서드로 판별하는
     * CSRF 방어는 상태를 바꾸는 GET을 아예 보지 못한다.
     */
    @PostMapping(value = "searchId/sendCode")
    public ResultDTO<Void> searchIdSendCode(HttpServletRequest request, HttpSession session) {
        String email = normalizeEmail(request.getParameter("email"));
        if (email == null) return ResultDTO.error("MISSING_PARAMETER");
        if (!EMAIL_PATTERN.matcher(email).matches()) return ResultDTO.error("INVALID_EMAIL");

        try {
            UserDTO user = userService.getId(email);
            if (user == null) return ResultDTO.error("USER_NOT_FOUND");

            String code = userService.sendVerificationCode(email);
            if (code == null) return ResultDTO.error("MAIL_SEND_FAILED");

            session.setAttribute("SESSION_FIND_ID_TARGET", user.getId());
            session.setAttribute("SESSION_FIND_ID_CODE", code);
            session.setAttribute("SESSION_FIND_ID_EXPIRES", System.currentTimeMillis() + VERIFICATION_TTL_MS);
            session.setAttribute("SESSION_FIND_ID_ATTEMPTS", 0);

            return ResultDTO.success("SENT_CODE");
        } catch (Exception e) {
            log.warn("searchIdSendCode failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "searchId/verify")
    public ResultDTO<UserDTO> searchIdVerify(HttpServletRequest request, HttpSession session) {
        String code = request.getParameter("code");
        if (code == null) return ResultDTO.error("MISSING_PARAMETER");

        String target = (String) session.getAttribute("SESSION_FIND_ID_TARGET");
        if (target == null) return ResultDTO.error("INVALID_ACCESS");

        if (!consumeCodeAttempt(session, "SESSION_FIND_ID_CODE", "SESSION_FIND_ID_EXPIRES",
                                "SESSION_FIND_ID_ATTEMPTS", code)) {
            return ResultDTO.error("INVALID_CODE");
        }

        session.removeAttribute("SESSION_FIND_ID_TARGET");
        return ResultDTO.success("USER_FOUND", UserDTO.fromId(target));
    }

    // ================= 비밀번호 재설정 =================

    /**
     * 1단계: 계정을 특정하고 그 주소로 코드를 보낸다.
     *
     * <p>아이디와 이메일은 비밀이 아니다 — 알 수 있는 정보다. 그 둘이 맞았다고 비밀번호를 바꿀
     * 권한이 생기면 안 되고, 여기서 얻는 것은 이미 등록된 주소로 가는 코드뿐이다. 실제 권한은
     * 그 코드를 갖고 있다는 사실이 준다(verifyResetCode 참고).
     */
    @PostMapping(value = "searchPassword")
    public ResultDTO<Void> searchPassword(HttpServletRequest request, HttpSession session) {
        String id = normalizeId(request.getParameter("id"));
        String email = normalizeEmail(request.getParameter("email"));
        if (id == null || email == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            UserDTO user = userService.getId(email, id);
            if (user == null) return ResultDTO.error("USER_NOT_FOUND");

            // 끝나지 않은 이전 시도는 새 시도가 시작되는 순간 무효다.
            session.removeAttribute("NEW_PASSWORD");

            String code = userService.sendVerificationCode(email);
            if (code == null) return ResultDTO.error("MAIL_SEND_FAILED");

            session.setAttribute("SESSION_RESET_TARGET", user.getId());
            session.setAttribute("SESSION_RESET_CODE", code);
            session.setAttribute("SESSION_RESET_EXPIRES", System.currentTimeMillis() + VERIFICATION_TTL_MS);
            session.setAttribute("SESSION_RESET_ATTEMPTS", 0);

            return ResultDTO.success("SENT_CODE");
        } catch (Exception e) {
            log.warn("searchPassword failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    /** 2단계: 코드를 갖고 있음을 증명해야 비로소 새 비밀번호를 정할 권한이 생긴다. */
    @PostMapping(value = "verifyResetCode")
    public ResultDTO<Void> verifyResetCode(HttpServletRequest request, HttpSession session) {
        String code = request.getParameter("code");
        if (code == null) return ResultDTO.error("MISSING_PARAMETER");

        String target = (String) session.getAttribute("SESSION_RESET_TARGET");
        if (target == null) return ResultDTO.error("INVALID_ACCESS");

        if (!consumeCodeAttempt(session, "SESSION_RESET_CODE", "SESSION_RESET_EXPIRES",
                                "SESSION_RESET_ATTEMPTS", code)) {
            return ResultDTO.error("INVALID_CODE");
        }

        // 검증됨 — newPassword가 실제로 인정하는 속성으로 승격시킨다.
        session.removeAttribute("SESSION_RESET_TARGET");
        session.setAttribute("NEW_PASSWORD", target);

        return ResultDTO.success("VERIFICATION_COMPLETE");
    }

    /** 3단계: 위에서 검증된 계정의 비밀번호를 바꾼다. */
    @PostMapping(value = "newPassword")
    public ResultDTO<Void> newPassword(HttpServletRequest request, HttpSession session) throws Exception {
        String targetId = (String) session.getAttribute("NEW_PASSWORD");
        if (targetId == null || targetId.isEmpty()) return ResultDTO.error("INVALID_ACCESS");

        String password = request.getParameter("password");
        if (password == null) return ResultDTO.error("MISSING_PARAMETER");
        if (password.length() < 8) return ResultDTO.error("INVALID_PASSWORD");

        userService.updatePassword(targetId, password);
        log.info("Password reset completed for {}", targetId);

        session.removeAttribute("NEW_PASSWORD");

        return ResultDTO.success("UPDATE_COMPLETE");
    }
}
