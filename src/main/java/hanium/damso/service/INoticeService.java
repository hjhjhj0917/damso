package hanium.damso.service;

import hanium.damso.dto.NoticeDTO;

import java.util.List;

public interface INoticeService {
    List<NoticeDTO> getList() throws Exception;
    NoticeDTO getInfo(String noticeId) throws Exception;
}
