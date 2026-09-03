package hanium.damso.service;

import hanium.damso.dto.AutobiographyDTO;

import java.util.List;

public interface IAutobiographyService {
    List<AutobiographyDTO> getList(String userId) throws Exception;

    AutobiographyDTO getInfo(String autobiographyId) throws Exception;

    AutobiographyDTO create(AutobiographyDTO pDTO) throws Exception;

    int update(AutobiographyDTO pDTO) throws Exception;

    int delete(String autobiographyId, String userId) throws Exception;

    /**
     * 쌓인 일기를 엮어 새 장을 쓰고 저장한다.
     *
     * <p>기존 장을 덮어쓰지 않는다. 사람이 손본 글이 낡았는지 판단할 근거가 여기엔 없다 —
     * 다시 쓰고 싶으면 지우고 새로 만든다.
     *
     * @param period 이 장이 다룰 시기. null이면 모델이 정한다.
     * @return 저장된 장. 모델이 쓸 만한 답을 못 주면 null
     * @throws IllegalStateException        일기가 모자랄 때("NOT_ENOUGH_SOURCE"). 모델은 부르지 않는다
     * @throws ServiceUnavailableException  모델이 설정되지 않았을 때
     */
    AutobiographyDTO generate(String userId, String period) throws Exception;
}
