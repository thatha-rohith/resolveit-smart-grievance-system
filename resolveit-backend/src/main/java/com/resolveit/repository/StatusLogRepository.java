package com.resolveit.repository;

import com.resolveit.model.StatusLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StatusLogRepository extends JpaRepository<StatusLog, Long> {

    // Automatically generates: SELECT s FROM StatusLog s WHERE s.complaint.id = :complaintId ORDER BY s.updatedAt ASC
    List<StatusLog> findByComplaintIdOrderByUpdatedAtAsc(Long complaintId);

    // Automatically generates: SELECT s FROM StatusLog s WHERE s.complaint.id = :complaintId ORDER BY s.updatedAt DESC
    List<StatusLog> findByComplaintIdOrderByUpdatedAtDesc(Long complaintId);

    // Custom query needed for filtering by internalNote
    @Query("SELECT s FROM StatusLog s WHERE s.complaint.id = :complaintId AND s.internalNote = false ORDER BY s.updatedAt ASC")
    List<StatusLog> findPublicLogsByComplaintId(@Param("complaintId") Long complaintId);

    // Automatically generates: SELECT s FROM StatusLog s WHERE s.updatedBy.id = :userId
    List<StatusLog> findByUpdatedById(Long userId);

    // Automatically generates: SELECT s FROM StatusLog s WHERE s.complaint.id = :complaintId AND s.status = :status
    List<StatusLog> findByComplaintIdAndStatus(Long complaintId, com.resolveit.model.ComplaintState status);

    // Automatically generates: DELETE FROM StatusLog s WHERE s.complaint.id = :complaintId
    void deleteByComplaintId(Long complaintId);

    // Automatically generates: DELETE FROM StatusLog s WHERE s.updatedBy.id = :userId
    void deleteByUpdatedById(Long userId);

    // Automatically generates: SELECT COUNT(s) FROM StatusLog s WHERE s.complaint.id = :complaintId
    long countByComplaintId(Long complaintId);

    // Automatically generates: SELECT s FROM StatusLog s WHERE s.complaint.id = :complaintId
    List<StatusLog> findByComplaintId(Long complaintId);

    // Automatically generates: SELECT s FROM StatusLog s WHERE s.internalNote = :internalNote
    List<StatusLog> findByInternalNote(Boolean internalNote);

    // Automatically generates: SELECT s FROM StatusLog s WHERE s.updatedAt BETWEEN :startDate AND :endDate
    List<StatusLog> findByUpdatedAtBetween(java.time.LocalDateTime startDate, java.time.LocalDateTime endDate);

    // Automatically generates: SELECT s FROM StatusLog s WHERE s.complaint.id = :complaintId AND s.updatedBy.id = :userId
    List<StatusLog> findByComplaintIdAndUpdatedById(Long complaintId, Long userId);

    // Automatically generates: SELECT s FROM StatusLog s WHERE s.status IN :statuses
    List<StatusLog> findByStatusIn(List<com.resolveit.model.ComplaintState> statuses);
}