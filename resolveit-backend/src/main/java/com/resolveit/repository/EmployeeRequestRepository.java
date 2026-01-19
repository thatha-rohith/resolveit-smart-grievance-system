package com.resolveit.repository;

import com.resolveit.model.EmployeeRequest;
import com.resolveit.model.EmployeeRequest.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRequestRepository extends JpaRepository<EmployeeRequest, Long> {

    // Find a single employee request by user ID (returns latest or throws)
    Optional<EmployeeRequest> findTopByUserIdOrderByRequestedAtDesc(Long userId);

    // Find all employee requests by user ID (returns list)
    List<EmployeeRequest> findAllByUserIdOrderByRequestedAtDesc(Long userId);

    // Find pending request by user ID
    Optional<EmployeeRequest> findByUserIdAndStatus(Long userId, Status status);

    // Check if user has a pending request
    boolean existsByUserIdAndStatus(Long userId, Status status);

    // Find all requests by status
    List<EmployeeRequest> findByStatus(Status status);

    // Find all requests ordered by requested date
    List<EmployeeRequest> findAllByOrderByRequestedAtDesc();

    // Find requests by status and order by requested date
    List<EmployeeRequest> findByStatusOrderByRequestedAtDesc(Status status);

    // Find requests by admin reviewer ID
    List<EmployeeRequest> findByReviewedByAdminId(Long adminId);

    // Count requests by status
    long countByStatus(Status status);

    // Check if any request exists for user
    boolean existsByUserId(Long userId);
}