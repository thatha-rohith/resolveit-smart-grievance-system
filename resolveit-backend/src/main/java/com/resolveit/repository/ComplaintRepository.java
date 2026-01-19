package com.resolveit.repository;

import com.resolveit.model.Complaint;
import com.resolveit.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    // Basic queries
    List<Complaint> findByUser(User user);
    List<Complaint> findByAssignedEmployee(User employee);

    // Fixed: Get complaints escalated to a user
    List<Complaint> findByEscalatedTo(User user);

    List<Complaint> findByIsPublicTrueOrderByCreatedAtDesc();

    // NEW: Find complaints by user where anonymous is false (for "My Complaints" page)
    @Query("SELECT c FROM Complaint c WHERE c.user = :user AND c.anonymous = false ORDER BY c.createdAt DESC")
    List<Complaint> findByUserAndAnonymousFalse(@Param("user") User user);

    // NEW: Find public complaints (both anonymous and non-anonymous that are public)
    @Query("SELECT c FROM Complaint c WHERE c.isPublic = true ORDER BY c.createdAt DESC")
    List<Complaint> findPublicComplaints();

    // NEW: Find complaints by status
    List<Complaint> findByStatus(String status);

    // NEW: Find recent complaints
    @Query("SELECT c FROM Complaint c ORDER BY c.createdAt DESC")
    List<Complaint> findAllOrderByCreatedAtDesc();

    // Escalation related queries
    @Query("SELECT c FROM Complaint c WHERE c.lastStatusChangeDate < :date " +
            "AND c.status = 'UNDER_REVIEW' AND c.escalatedTo IS NULL")
    List<Complaint> findOverdueComplaints(@Param("date") LocalDateTime date);

    @Query("SELECT c FROM Complaint c WHERE c.requiresEscalation = true")
    List<Complaint> findComplaintsRequiringEscalation();

    @Query("SELECT COUNT(c) FROM Complaint c WHERE c.escalatedTo = :employee")
    Long countByEscalatedTo(@Param("employee") User employee);

    // Get all escalated complaints (for admins/seniors)
    @Query("SELECT c FROM Complaint c WHERE c.escalatedTo IS NOT NULL ORDER BY c.escalationDate DESC")
    List<Complaint> findAllEscalatedComplaints();

    // Find complaints that need escalation
    @Query("SELECT c FROM Complaint c WHERE " +
            "c.escalatedTo IS NULL AND " + // Not already escalated
            "c.status != 'RESOLVED' AND " + // Not resolved
            "(" +
            "   (c.assignedEmployee IS NULL AND c.createdAt < :thresholdDate) OR " + // Unassigned for too long
            "   (c.assignedEmployee IS NOT NULL AND " +
            "    (c.lastStatusChangeDate < :thresholdDate OR c.createdAt < :thresholdDate))" + // Assigned but stuck
            ") " +
            "ORDER BY c.createdAt ASC") // Oldest first
    List<Complaint> findComplaintsForEscalation(@Param("thresholdDate") LocalDateTime thresholdDate);

    // Dashboard statistics queries
    @Query("SELECT c.category, COUNT(c) FROM Complaint c GROUP BY c.category")
    List<Object[]> getComplaintsCountByCategory();

    @Query("SELECT DATE(c.createdAt), COUNT(c) FROM Complaint c " +
            "WHERE c.createdAt >= :startDate GROUP BY DATE(c.createdAt)")
    List<Object[]> getDailyComplaints(@Param("startDate") LocalDateTime startDate);

    @Query("SELECT c FROM Complaint c WHERE " +
            "(:status IS NULL OR c.status = :status) AND " +
            "(:category IS NULL OR c.category = :category) AND " +
            "(:startDate IS NULL OR c.createdAt >= :startDate) AND " +
            "(:endDate IS NULL OR c.createdAt <= :endDate)")
    List<Complaint> findWithFilters(@Param("status") String status,
                                    @Param("category") String category,
                                    @Param("startDate") LocalDateTime startDate,
                                    @Param("endDate") LocalDateTime endDate);

    // Find complaints with attachments
    @Query("SELECT c FROM Complaint c WHERE c.id IN " +
            "(SELECT a.complaint.id FROM Attachment a GROUP BY a.complaint.id HAVING COUNT(a) > 0)")
    List<Complaint> findComplaintsWithAttachments();

    // NEW: Count statistics
    @Query("SELECT COUNT(c) FROM Complaint c")
    Long countTotalComplaints();

    @Query("SELECT COUNT(c) FROM Complaint c WHERE c.status = 'NEW'")
    Long countNewComplaints();

    @Query("SELECT COUNT(c) FROM Complaint c WHERE c.status = 'UNDER_REVIEW'")
    Long countUnderReviewComplaints();

    @Query("SELECT COUNT(c) FROM Complaint c WHERE c.status = 'RESOLVED'")
    Long countResolvedComplaints();

    @Query("SELECT COUNT(c) FROM Complaint c WHERE c.anonymous = true")
    Long countAnonymousComplaints();

    // NEW: Get complaints by urgency
    @Query("SELECT c FROM Complaint c WHERE c.urgency = :urgency ORDER BY c.createdAt DESC")
    List<Complaint> findByUrgency(@Param("urgency") String urgency);

    // NEW: Search complaints
    @Query("SELECT c FROM Complaint c WHERE " +
            "LOWER(c.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(c.description) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(c.category) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<Complaint> searchComplaints(@Param("search") String search);
}