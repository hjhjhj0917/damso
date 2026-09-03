package hanium.damso.service.impl;

import hanium.damso.dto.ContentDTO;
import hanium.damso.mapper.IContentMapper;
import hanium.damso.service.IContentService;
import hanium.damso.util.IdUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@RequiredArgsConstructor
@Service
public class ContentService implements IContentService {
    private final IContentMapper contentMapper;

    /**
     * 여기에는 @Transactional을 붙이지 않는다.
     *
     * <p>이 메서드는 절대 혼자 불리지 않는다 — 호출자가 자식 행까지 넣어야 비로소 의미가 있는
     * 반쪽짜리 작업이라서, 트랜잭션 경계는 호출자(DiaryService.create 등)에 있어야 한다.
     * 여기에 REQUIRED를 붙이면 호출자에 경계가 없을 때 이 INSERT만 조용히 커밋되고 고아 행이 남는다.
     */
    @Override
    public String create(String userId, ContentDTO.Type type) throws Exception {
        ContentDTO pDTO = new ContentDTO();
        pDTO.setContentId(IdUtil.generate(IdUtil.CONTENT));
        pDTO.setUserId(userId);
        pDTO.setContentType(type);

        contentMapper.insertContent(pDTO);

        return pDTO.getContentId();
    }

    @Override
    public ContentDTO getInfo(String contentId) throws Exception {
        if (contentId == null) return null;
        return contentMapper.getContent(ContentDTO.of(contentId));
    }

    @Override
    public boolean owns(String contentId, String userId) throws Exception {
        if (contentId == null || userId == null) return false;

        ContentDTO rDTO = contentMapper.getContent(ContentDTO.of(contentId));

        return rDTO != null && userId.equals(rDTO.getUserId());
    }

    @Override
    public int touch(String contentId) throws Exception {
        return contentMapper.touch(ContentDTO.of(contentId));
    }

    @Override
    public int delete(String contentId, String userId) throws Exception {
        ContentDTO pDTO = ContentDTO.of(contentId);
        pDTO.setUserId(userId);

        return contentMapper.deleteContent(pDTO);
    }
}
