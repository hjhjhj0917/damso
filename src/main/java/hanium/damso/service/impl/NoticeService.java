package hanium.damso.service.impl;

import hanium.damso.dto.NoticeDTO;
import hanium.damso.mapper.INoticeMapper;
import hanium.damso.service.INoticeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 공지사항 조회.
 *
 * <p>쓰기가 없다. 공지는 운영자가 DB에 직접 넣는다(docs/notice.sql) — 화면에도 "조회 전용"이라
 * 적혀 있다. 나중에 관리자 화면이 생기면 create/update/delete가 여기 붙는다.
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class NoticeService implements INoticeService {
    private final INoticeMapper noticeMapper;

    @Override
    public List<NoticeDTO> getList() throws Exception {
        return noticeMapper.selectList();
    }

    @Override
    public NoticeDTO getInfo(String noticeId) throws Exception {
        if (noticeId == null) return null;
        return noticeMapper.selectNotice(NoticeDTO.of(noticeId));
    }
}
