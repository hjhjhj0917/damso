package hanium.damso.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 * USER_INFO 한 행.
 *
 * <p>필드 이름은 DB 컬럼명과 다르다 — USER_ID/USER_NAME을 그대로 카멜케이스로 바꾸면
 * userId/userName이 되는데, 프론트가 쓰는 이름은 id/name이다. 매퍼 XML에서
 * {@code USER_ID AS ID} 로 별칭을 붙여 맞춘다.
 */
@Getter
@Setter
@ToString(exclude = {"password", "passwordSalt"})
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDTO {
    /**
     * USER_INFO.ROLES 컬럼의 CHECK 제약과 값이 정확히 같아야 한다. DB에만 있고 여기 없는 값이
     * 한 개라도 생기면 그 행을 읽는 순간 MyBatis 열거형 핸들러 안에서 터진다 — 컬럼에서가 아니라.
     */
    public enum Role {
        USER,
        GUARDIAN,
        ADMIN
    }

    private String id;
    private String name;

    /** SHA-256(PEPPER + 평문 + SALT) 32바이트. 응답에 절대 실리면 안 된다. */
    @JsonIgnore
    private byte[] password;

    @JsonIgnore
    private byte[] passwordSalt;

    private String email;
    private String phone;
    private Role roles;
    private String birthDate;
    private Boolean onboardingCompleted;
    private Long createdAt;
    private Long updatedAt;

    /** getIdExists/getEmailExists 전용. COUNT(*) > 0 결과를 받는다. */
    private Boolean exists;

    public static UserDTO fromId(String id) {
        UserDTO result = new UserDTO();
        result.setId(id);
        return result;
    }

    /** 로그인 직후와 마이페이지가 쓰는 응답 형태. 비밀번호 계열이 아예 들어올 수 없다. */
    @Getter
    @Setter
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class PlainUserDTO {
        private String id;
        private String name;
        private String email;
        private String phone;
        private Role roles;
        private String birthDate;
        private Boolean onboardingCompleted;
        private Long createdAt;
        private Long updatedAt;

        public static PlainUserDTO of(UserDTO user) {
            return new PlainUserDTO(
                    user.getId(), user.getName(), user.getEmail(), user.getPhone(),
                    user.getRoles(), user.getBirthDate(), user.getOnboardingCompleted(),
                    user.getCreatedAt(), user.getUpdatedAt());
        }
    }
}
