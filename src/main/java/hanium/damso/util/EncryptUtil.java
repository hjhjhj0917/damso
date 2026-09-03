package hanium.damso.util;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;

/**
 * 비밀번호 해싱.
 *
 * <p>kindy의 EncryptUtil에서 AES 부분을 들어냈다. 담소는 주소/우편번호를 받지 않아 암호화해서
 * 보관할 컬럼이 없다. 나중에 일기 본문 같은 걸 암호화하게 되면 그때 되살리면 된다.
 *
 * <p>PEPPER는 모든 비밀번호 해시에 들어간다. 값이 바뀌면 그 이전에 저장된 해시를 하나도 못 읽는다
 * — 즉 전 계정 로그인 불가. 부팅할 때마다 새로 만드는 것도, 여기에 상수로 적어 두는 것도 답이 아니라
 * 시작 시점에 거부하는 쪽을 택했다.
 */
@Component
public class EncryptUtil {
    @Value("${damso.encrypt.salt}")
    private String PEPPER;

    private final SecureRandom secureRandom = new SecureRandom();

    @PostConstruct
    void validate() {
        if (PEPPER == null || PEPPER.isBlank())
            throw new IllegalStateException("SALT (damso.encrypt.salt) must not be blank");
    }

    /** 계정마다 하나씩. 같은 비밀번호를 쓰는 두 계정의 해시가 같아지지 않게 한다. */
    public byte[] getSecureSalt() {
        byte[] salt = new byte[16];
        secureRandom.nextBytes(salt);
        return salt;
    }

    public byte[] encHashSHA256(String str, byte[] salt) {
        if (str == null) return null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(PEPPER.getBytes(StandardCharsets.UTF_8));
            digest.update(str.getBytes(StandardCharsets.UTF_8));
            if (salt != null) digest.update(salt);
            return digest.digest();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
