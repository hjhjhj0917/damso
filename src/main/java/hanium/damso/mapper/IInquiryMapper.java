package hanium.damso.mapper;

import hanium.damso.dto.InquiryDTO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface IInquiryMapper {
    List<InquiryDTO> selectList(InquiryDTO pDTO);

    InquiryDTO selectInquiry(InquiryDTO pDTO);

    int insertInquiry(InquiryDTO pDTO);

    /** 답변과 상태를 함께 올린다. 둘 중 온 것만 바뀐다. */
    int updateAnswer(InquiryDTO pDTO);
}
