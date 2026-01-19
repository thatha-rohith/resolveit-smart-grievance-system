package com.resolveit.repository;

import com.resolveit.model.ComplaintComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ComplaintCommentRepository extends JpaRepository<ComplaintComment, Long> {
    List<ComplaintComment> findByComplaintIdOrderByCreatedAtAsc(Long complaintId);

    @Query("SELECT COUNT(c) FROM ComplaintComment c WHERE c.complaint.id = :complaintId")
    long countByComplaintId(@Param("complaintId") Long complaintId);
}