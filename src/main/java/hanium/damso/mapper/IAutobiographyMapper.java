package hanium.damso.mapper;

import hanium.damso.dto.AutobiographyDTO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface IAutobiographyMapper {
    List<AutobiographyDTO> selectList(@Param("userId") String userId);

    AutobiographyDTO selectAutobiography(AutobiographyDTO pDTO);

    int insertAutobiography(AutobiographyDTO pDTO);

    int updateAutobiography(AutobiographyDTO pDTO);
}
