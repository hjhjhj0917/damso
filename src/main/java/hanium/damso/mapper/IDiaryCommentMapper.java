package hanium.damso.mapper;

import hanium.damso.dto.DiaryDTO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface IDiaryCommentMapper {
    List<DiaryDTO.CommentDTO> selectCommentList(@Param("diaryId") String diaryId);

    DiaryDTO.CommentDTO selectComment(@Param("commentId") String commentId);

    int insertComment(DiaryDTO.CommentDTO pDTO);

    /** 작성자 조건이 문장 안에 있다. 남의 댓글이면 0. */
    int updateComment(@Param("commentId") String commentId,
                      @Param("authorId") String authorId,
                      @Param("content") String content);

    /** 작성자 본인이 지우는 경로. */
    int deleteCommentByAuthor(@Param("commentId") String commentId,
                              @Param("authorId") String authorId);

    /**
     * 일기 주인이 지우는 경로.
     *
     * <p>자기 일기에 달린 말을 지울 권리는 쓴 사람뿐 아니라 그 글의 주인에게도 있어야 한다.
     * 두 경로를 한 문장에 OR로 합치지 않은 이유: 합치면 조건이 길어져 어느 쪽이 통과시켰는지
     * 읽어 낼 수 없고, 실수로 한쪽 괄호를 놓치면 아무나 지울 수 있게 된다.
     */
    int deleteCommentByDiaryOwner(@Param("commentId") String commentId,
                                  @Param("ownerId") String ownerId);
}
