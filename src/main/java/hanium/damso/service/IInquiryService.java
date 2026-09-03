package hanium.damso.service;

import hanium.damso.dto.InquiryDTO;

import java.util.List;

public interface IInquiryService {
    List<InquiryDTO> getList(String userId) throws Exception;

    InquiryDTO getInfo(String inquiryId) throws Exception;

    InquiryDTO create(InquiryDTO pDTO) throws Exception;

    int answer(InquiryDTO pDTO) throws Exception;
}
