package hanium.damso.mapper;

import hanium.damso.dto.LinkDTO;
import hanium.damso.dto.UserDTO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ILinkMapper {
    /**
     * 대조 조건에 맞는 어르신 계정.
     *
     * <p>단건이 아니라 목록을 돌려주는 것이 중요하다. PHONE에 UNIQUE가 없어서 같은 번호를 쓰는
     * 동명이인이 나올 수 있고, 그때는 아무나 고르는 게 아니라 거절해야 한다.
     */
    List<UserDTO> selectWardCandidates(LinkDTO.QueryDTO pDTO);

    /** 있으면 되살리고 없으면 만든다. 소프트 삭제된 행이 유니크 키를 점유하고 있기 때문이다. */
    int insertLink(LinkDTO pDTO);

    LinkDTO selectLink(LinkDTO pDTO);

    List<LinkDTO> selectWards(@Param("guardianId") String guardianId);

    List<LinkDTO> selectGuardians(@Param("wardId") String wardId);

    int deleteLink(LinkDTO pDTO);
}
