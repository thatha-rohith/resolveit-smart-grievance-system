package com.resolveit.repository;

import com.resolveit.model.ComplaintLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ComplaintLikeRepository extends JpaRepository<ComplaintLike, Long> {
    Optional<ComplaintLike> findByComplaintIdAndUserId(Long complaintId, Long userId);

    @Query("SELECT COUNT(l) FROM ComplaintLike l WHERE l.complaint.id = :complaintId")
    long countByComplaintId(@Param("complaintId") Long complaintId);
}