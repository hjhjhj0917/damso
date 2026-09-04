package hanium.damso.mapper;

import hanium.damso.dto.ContentDTO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface IContentMapper {
    int insertContent(ContentDTO pDTO);

    ContentDTO getContent(ContentDTO pDTO);

    int touch(ContentDTO pDTO);

    /** userId가 주인이 아니면 0을 돌려준다. 조회를 한 번 더 하지 않는다. */
    int deleteContent(ContentDTO pDTO);
}
