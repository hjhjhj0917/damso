package hanium.damso.service;

import hanium.damso.dto.UserDTO;

public interface IUserService {
    UserDTO getIdExists(String id) throws Exception;

    UserDTO getEmailExists(String email) throws Exception;

    /** 인증번호를 만들어 메일로 보낸다. 발송에 실패하면 null. */
    String sendVerificationCode(String email) throws Exception;

    int create(UserDTO pDTO) throws Exception;

    /** 비밀번호가 맞으면 UserDTO, 아니면 null. 탈퇴한 계정도 null. */
    UserDTO login(String id, String password) throws Exception;

    UserDTO getInfo(String id) throws Exception;

    int update(UserDTO pDTO) throws Exception;

    UserDTO getId(String email) throws Exception;

    UserDTO getId(String email, String id) throws Exception;

    int updatePassword(String id, String password) throws Exception;

    int completeOnboarding(String id) throws Exception;

    int withdraw(String id) throws Exception;
}
