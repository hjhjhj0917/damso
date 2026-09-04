package hanium.damso.service.impl;

import hanium.damso.dto.UserDTO;
import hanium.damso.mapper.IUserMapper;
import hanium.damso.service.IUserService;
import hanium.damso.util.EncryptUtil;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Arrays;

@Slf4j
@RequiredArgsConstructor
@Service
public class UserService implements IUserService {
    private final IUserMapper userMapper;
    private final EncryptUtil encryptUtil;
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String EMAIL_SENDER;

    private static final String MAIL_TITLE = "[담소] 인증 메일";
    private static final String MAIL_CONTENT = "담소 서비스 이용을 위한 인증 메일입니다. 인증 번호: ";

    private static final SecureRandom VERIFICATION_CODE_RANDOM = new SecureRandom();

    @Override
    public UserDTO getIdExists(String id) throws Exception {
        return userMapper.getIdExists(UserDTO.fromId(id));
    }

    @Override
    public UserDTO getEmailExists(String email) throws Exception {
        UserDTO pDTO = new UserDTO();
        pDTO.setEmail(email);
        return userMapper.getEmailExists(pDTO);
    }

    /**
     * 인증번호를 만들어 보낸다.
     *
     * <p>ThreadLocalRandom이 아니라 SecureRandom인 이유는 이 숫자가 자격증명이기 때문이다.
     * 전자는 관측값이 몇 개 쌓이면 다음 값을 예측할 수 있고, 발송은 호출자가 원하는 만큼
     * 반복시킬 수 있다.
     */
    @Override
    public String sendVerificationCode(String email) throws Exception {
        String code = String.format("%06d", VERIFICATION_CODE_RANDOM.nextInt(1000000));

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
        try {
            helper.setTo(email);
            helper.setFrom(EMAIL_SENDER);
            helper.setSubject(MAIL_TITLE);
            helper.setText(MAIL_CONTENT + code, false);
            mailSender.send(message);
            return code;
        } catch (Exception e) {
            // 인증번호 자체는 절대 로그에 남기지 않는다. 서버 로그는 받은편지함보다 읽기 쉽다.
            log.warn("Verification mail could not be sent", e);
        }
        return null;
    }

    @Transactional
    @Override
    public int create(UserDTO pDTO) throws Exception {
        if (pDTO.getId() == null || pDTO.getId().length() < 4 || pDTO.getId().length() > 20)
            throw new IllegalArgumentException();
        if (pDTO.getName() == null) throw new NullPointerException();
        if (pDTO.getPassword() == null) throw new NullPointerException();
        if (pDTO.getPhone() == null) throw new NullPointerException();
        if (pDTO.getEmail() == null) throw new NullPointerException();
        if (pDTO.getRoles() == null) throw new NullPointerException();

        return userMapper.insertUser(pDTO);
    }

    @Override
    public UserDTO login(String id, String password) throws Exception {
        UserDTO rDTO = userMapper.getLogin(UserDTO.fromId(id));

        if (rDTO == null || rDTO.getPassword() == null) return null;

        // Arrays.equals로 32바이트를 통째로 비교한다. 저장된 솔트로 다시 해싱해야 하므로
        // 평문을 되돌리는 경로는 어디에도 없다.
        if (!Arrays.equals(encryptUtil.encHashSHA256(password, rDTO.getPasswordSalt()), rDTO.getPassword()))
            return null;

        rDTO.setPassword(null);
        rDTO.setPasswordSalt(null);

        return rDTO;
    }

    @Override
    public UserDTO getInfo(String id) throws Exception {
        return userMapper.getInfo(UserDTO.fromId(id));
    }

    @Transactional
    @Override
    public int update(UserDTO pDTO) throws Exception {
        // updateInfo는 도착한 필드로만 SET 절을 만든다. 하나도 없으면 "UPDATE ... SET WHERE"라는
        // 유효하지 않은 SQL이 나간다. 컨트롤러가 먼저 거르지만 여기서도 막아 둔다.
        if (pDTO.getName() == null && pDTO.getPhone() == null && pDTO.getBirthDate() == null) return 0;

        return userMapper.updateInfo(pDTO);
    }

    @Override
    public UserDTO getId(String email) throws Exception {
        return getId(email, null);
    }

    @Override
    public UserDTO getId(String email, String id) throws Exception {
        UserDTO pDTO = new UserDTO();
        pDTO.setEmail(email);
        pDTO.setId(id);
        return userMapper.getId(pDTO);
    }

    @Transactional
    @Override
    public int updatePassword(String id, String password) throws Exception {
        // 비밀번호를 바꿀 때 솔트도 함께 새로 뽑는다. 솔트를 재사용하면 예전 해시와 새 해시를
        // 나란히 얻은 공격자가 두 비밀번호를 같은 조건에서 비교할 수 있게 된다.
        byte[] salt = encryptUtil.getSecureSalt();

        UserDTO pDTO = UserDTO.fromId(id);
        pDTO.setPasswordSalt(salt);
        pDTO.setPassword(encryptUtil.encHashSHA256(password, salt));

        return userMapper.updatePassword(pDTO);
    }

    @Transactional
    @Override
    public int completeOnboarding(String id) throws Exception {
        return userMapper.completeOnboarding(UserDTO.fromId(id));
    }

    @Transactional
    @Override
    public int withdraw(String id) throws Exception {
        return userMapper.withdraw(UserDTO.fromId(id));
    }
}
