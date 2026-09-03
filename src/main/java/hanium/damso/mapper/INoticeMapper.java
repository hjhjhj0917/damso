package hanium.damso.mapper;

import hanium.damso.dto.NoticeDTO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface INoticeMapper {
    List<NoticeDTO> selectList();
    NoticeDTO selectNotice(NoticeDTO pDTO);
}
