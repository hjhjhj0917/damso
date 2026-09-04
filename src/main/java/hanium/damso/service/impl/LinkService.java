package hanium.damso.service.impl;

import hanium.damso.dto.LinkDTO;
import hanium.damso.dto.UserDTO;
import hanium.damso.mapper.ILinkMapper;
import hanium.damso.service.ILinkService;
import hanium.damso.util.IdUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@RequiredArgsConstructor
@Service
public class LinkService implements ILinkService {
    private final ILinkMapper linkMapper;

    private static final String DEFAULT_RELATION = "자녀";

    /** RELATION의 컬럼 폭. */
    private static final int MAX_RELATION_LENGTH = 20;

    @Override
    public LinkDTO verify(String name, String residentFront, String residentBackFirst, String phone)
            throws Exception {
        UserDTO ward = this.findWard(name, residentFront, residentBackFirst, phone);
        if (ward == null) return null;

        // 이름과 전화번호는 요청자가 이미 알고 있던 값이라 되돌려줘도 새로 알려 주는 것이 없다.
        LinkDTO rDTO = new LinkDTO();
        rDTO.setWardName(ward.getName());
        rDTO.setWardPhone(ward.getPhone());

        return rDTO;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public LinkDTO link(String guardianId, String name, String residentFront, String residentBackFirst,
                        String phone, String relation) throws Exception {
        UserDTO ward = this.findWard(name, residentFront, residentBackFirst, phone);
        if (ward == null) return null;

        // CK_USER_LINK_SELF가 DB에서도 막지만, 여기서 먼저 걸러야 제약 위반이 아니라 이유가 있는
        // 응답이 나간다.
        if (guardianId.equals(ward.getId())) throw new IllegalArgumentException();

        LinkDTO pDTO = new LinkDTO();
        pDTO.setGuardianId(guardianId);
        pDTO.setWardId(ward.getId());

        if (linkMapper.selectLink(pDTO) != null) throw new IllegalStateException("ALREADY_LINKED");

        pDTO.setId(IdUtil.generate(IdUtil.LINK));
        pDTO.setRelation(normalizeRelation(relation));

        linkMapper.insertLink(pDTO);

        log.info("Link created: guardian {} -> ward {}", guardianId, ward.getId());

        return linkMapper.selectLink(pDTO);
    }

    @Override
    public List<LinkDTO> getWards(String guardianId) throws Exception {
        return linkMapper.selectWards(guardianId);
    }

    @Override
    public List<LinkDTO> getGuardians(String wardId) throws Exception {
        return linkMapper.selectGuardians(wardId);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public int unlink(String guardianId, String wardId) throws Exception {
        LinkDTO pDTO = new LinkDTO();
        pDTO.setGuardianId(guardianId);
        pDTO.setWardId(wardId);

        int result = linkMapper.deleteLink(pDTO);
        if (result > 0) log.info("Link removed: guardian {} -> ward {}", guardianId, wardId);

        return result;
    }

    @Override
    public boolean isGuardianOf(String guardianId, String wardId) {
        if (guardianId == null || wardId == null || guardianId.equals(wardId)) return false;

        LinkDTO pDTO = new LinkDTO();
        pDTO.setGuardianId(guardianId);
        pDTO.setWardId(wardId);

        try {
            return linkMapper.selectLink(pDTO) != null;
        } catch (Exception e) {
            log.warn("isGuardianOf({}, {}) failed - denying", guardianId, wardId, e);
            return false;
        }
    }

    @Override
    public boolean canView(String ownerId, String viewerId) {
        if (ownerId == null || viewerId == null) return false;
        return ownerId.equals(viewerId) || this.isGuardianOf(viewerId, ownerId);
    }

    @Override
    public boolean canComment(String ownerId, String viewerId) {
        if (ownerId == null || viewerId == null) return false;
        if (ownerId.equals(viewerId)) return false;
        return this.isGuardianOf(viewerId, ownerId);
    }

    // ================= 대조 =================

    /**
     * 이름 + 생년월일 + 전화번호로 어르신 계정 하나를 찾는다. 없거나 <b>둘 이상이면 null</b>.
     */
    private UserDTO findWard(String name, String residentFront, String residentBackFirst, String phone)
            throws Exception {
        String birthDate = birthDateOf(residentFront, residentBackFirst);
        if (birthDate == null || name == null || phone == null) return null;

        LinkDTO.QueryDTO pDTO = new LinkDTO.QueryDTO();
        pDTO.setName(name.trim());
        pDTO.setPhone(phone);
        pDTO.setBirthDate(birthDate);

        List<UserDTO> candidates = linkMapper.selectWardCandidates(pDTO);
        if (candidates == null || candidates.size() != 1) {
            if (candidates != null && candidates.size() > 1) {
                log.warn("Ward lookup matched {} accounts - refusing", candidates.size());
            }
            return null;
        }

        return candidates.get(0);
    }

    /**
     * 주민등록번호 앞 6자리와 뒷자리 첫 숫자를 {@code YYYY-MM-DD}로 환산한다. 형식이 아니면 null.
     *
     * <p>뒷자리 첫 숫자는 세기를 정하는 데만 쓴다 — 1·2는 1900년대, 3·4는 2000년대다.
     * <b>성별로는 아무것도 대조하지 않는다. USER_INFO에 성별 컬럼이 없기 때문이다.</b>
     * 나중에 이것을 "빠진 검사"로 오해하고 없는 컬럼을 상대로 채워 넣지 않도록 적어 둔다.
     *
     * <p>주민등록번호 자체는 어디에도 저장되지 않는다. 이 메서드의 결과만 남는다.
     */
    static String birthDateOf(String residentFront, String residentBackFirst) {
        if (residentFront == null || residentBackFirst == null) return null;
        if (!residentFront.matches("^\\d{6}$")) return null;
        if (!residentBackFirst.matches("^[1-4]$")) return null;

        String century = (residentBackFirst.charAt(0) <= '2') ? "19" : "20";
        String year = century + residentFront.substring(0, 2);
        String month = residentFront.substring(2, 4);
        String day = residentFront.substring(4, 6);

        int monthValue = Integer.parseInt(month);
        int dayValue = Integer.parseInt(day);
        if (monthValue < 1 || monthValue > 12 || dayValue < 1 || dayValue > 31) return null;

        return year + "-" + month + "-" + day;
    }

    private static String normalizeRelation(String relation) {
        if (relation == null || relation.isBlank()) return DEFAULT_RELATION;
        String trimmed = relation.trim();
        return trimmed.length() <= MAX_RELATION_LENGTH
                ? trimmed
                : trimmed.substring(0, MAX_RELATION_LENGTH);
    }
}
