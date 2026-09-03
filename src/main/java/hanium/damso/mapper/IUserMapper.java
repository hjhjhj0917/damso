package hanium.damso.mapper;

import hanium.damso.dto.UserDTO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface IUserMapper {
    UserDTO getIdExists(UserDTO pDTO);

    UserDTO getEmailExists(UserDTO pDTO);

    int insertUser(UserDTO pDTO);

    UserDTO getLogin(UserDTO pDTO);

    UserDTO getInfo(UserDTO pDTO);

    int updateInfo(UserDTO pDTO);

    /** 아이디 찾기 / 비밀번호 재설정 대상 조회. id를 함께 주면 그 계정으로 한정한다. */
    UserDTO getId(UserDTO pDTO);

    int updatePassword(UserDTO pDTO);

    int completeOnboarding(UserDTO pDTO);

    int withdraw(UserDTO pDTO);
}
