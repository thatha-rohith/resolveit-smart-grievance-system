package com.resolveit.repository;

import com.resolveit.model.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    @Query("SELECT COUNT(a) FROM Attachment a WHERE a.complaint.id = :complaintId")
    long countByComplaintId(@Param("complaintId") Long complaintId);
}