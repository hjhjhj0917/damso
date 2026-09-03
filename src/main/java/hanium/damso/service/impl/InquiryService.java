package hanium.damso.service.impl;

import hanium.damso.dto.InquiryDTO;
import hanium.damso.mapper.IInquiryMapper;
import hanium.damso.service.IInquiryService;
import hanium.damso.util.IdUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 1:1 문의.
 *
 * <p>CONTENT_MASTER를 거치지 않는다. INQUIRY가 USER_ID와 IS_DELETED를 직접 들고 있어서 마스터 행이
 * 필요 없고, 무엇보다 그 표에 얹으면 연결된 보호자에게 열리는 경로(canView)에 문의가 딸려 간다.
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class InquiryService implements IInquiryService {
    private final IInquiryMapper inquiryMapper;

    /** INQUIRY.TITLE의 컬럼 폭. sql_mode가 STRICT_TRANS_TABLES라 넘기면 잘리는 게 아니라 INSERT가 실패한다. */
    static final int MAX_TITLE_LENGTH = 255;

    /**
     * 문의 본문의 최소 길이. 프론트의 문의 폼과 같은 값이다.
     *
     * <p>화면이 이미 막고 있어도 여기서 다시 본다 — 폼을 거치지 않고 들어온 "네", "확인" 한 마디는
     * 상담원이 다시 물어보는 왕복만 늘린다.
     */
    static final int MIN_CONTENT_LENGTH = 10;

    @Override
    public List<InquiryDTO> getList(String userId) throws Exception {
        if (userId == null) return List.of();

        InquiryDTO pDTO = new InquiryDTO();
        pDTO.setUserId(userId);

        return inquiryMapper.selectList(pDTO);
    }

    @Override
    public InquiryDTO getInfo(String inquiryId) throws Exception {
        if (inquiryId == null) return null;
        return inquiryMapper.selectInquiry(InquiryDTO.of(inquiryId));
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public InquiryDTO create(InquiryDTO pDTO) throws Exception {
        if (pDTO.getUserId() == null) throw new NullPointerException();
        if (pDTO.getTitle() == null || pDTO.getTitle().isBlank()) throw new IllegalArgumentException();

        String content = pDTO.getContent() == null ? "" : pDTO.getContent().trim();
        if (content.length() < MIN_CONTENT_LENGTH) throw new IllegalArgumentException();

        pDTO.setContent(content);
        pDTO.setTitle(clip(pDTO.getTitle()));
        if (pDTO.getCategory() == null) pDTO.setCategory(InquiryDTO.Category.ETC);

        // 접수 상태는 요청에서 받지 않는다. 받는 순간 문의자가 자기 문의를 '답변완료'로 넣을 수 있다.
        pDTO.setStatus(InquiryDTO.Status.RECEIVED);
        pDTO.setId(IdUtil.generate(IdUtil.INQUIRY));

        inquiryMapper.insertInquiry(pDTO);

        log.info("Inquiry created: {} by {}", pDTO.getId(), pDTO.getUserId());

        return inquiryMapper.selectInquiry(InquiryDTO.of(pDTO.getId()));
    }

    /**
     * 운영자가 답을 달거나 상태만 옮긴다.
     *
     * <p>답변 본문이 오면 상태는 자동으로 ANSWERED가 된다 — 답이 달린 채 "접수완료"로 남는 화면을
     * 만들지 않기 위해서다. 상태를 따로 지정했으면 그 값을 존중한다(답을 달면서 아직 확인 중이라고
     * 표시해야 하는 경우가 있다).
     */
    @Transactional(rollbackFor = Exception.class)
    @Override
    public int answer(InquiryDTO pDTO) throws Exception {
        if (pDTO.getId() == null) throw new NullPointerException();

        String answer = pDTO.getAnswer() == null ? null : pDTO.getAnswer().trim();
        if (answer != null && answer.isEmpty()) answer = null;
        if (answer == null && pDTO.getStatus() == null) throw new IllegalArgumentException();

        pDTO.setAnswer(answer);
        if (answer != null && pDTO.getStatus() == null) pDTO.setStatus(InquiryDTO.Status.ANSWERED);

        int result = inquiryMapper.updateAnswer(pDTO);
        if (result == 1) log.info("Inquiry answered: {} by {}", pDTO.getId(), pDTO.getAnsweredBy());

        return result;
    }

    static String clip(String title) {
        if (title == null) return null;
        String trimmed = title.trim();
        return trimmed.length() <= MAX_TITLE_LENGTH ? trimmed : trimmed.substring(0, MAX_TITLE_LENGTH);
    }
}
