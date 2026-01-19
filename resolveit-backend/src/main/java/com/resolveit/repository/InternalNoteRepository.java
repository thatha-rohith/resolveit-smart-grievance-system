package com.resolveit.repository;

import com.resolveit.model.InternalNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InternalNoteRepository extends JpaRepository<InternalNote, Long> {
    List<InternalNote> findByComplaintIdOrderByCreatedAtDesc(Long complaintId);

    @Query("SELECT n FROM InternalNote n WHERE n.complaint.id = :complaintId AND " +
            "(n.isPrivate = false OR n.user.id = :userId OR n.mentionedUser.id = :userId OR " +
            "EXISTS (SELECT 1 FROM Complaint c WHERE c.id = n.complaint.id AND " +
            "(c.assignedEmployee.id = :userId OR c.escalatedTo.id = :userId OR c.user.id = :userId))) " +
            "ORDER BY n.createdAt DESC")
    List<InternalNote> findVisibleNotes(@Param("complaintId") Long complaintId,
                                        @Param("userId") Long userId);

    List<InternalNote> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<InternalNote> findByMentionedUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT COUNT(n) FROM InternalNote n WHERE n.complaint.id = :complaintId")
    Long countByComplaintId(@Param("complaintId") Long complaintId);
}