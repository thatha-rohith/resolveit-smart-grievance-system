package com.resolveit.repository;
import com.resolveit.model.EmployeeSeniorRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeSeniorRequestRepository extends JpaRepository<EmployeeSeniorRequest, Long> {
    Optional<EmployeeSeniorRequest> findByEmployeeIdAndStatus(Long employeeId, EmployeeSeniorRequest.Status status);
    List<EmployeeSeniorRequest> findByEmployeeIdOrderByRequestedAtDesc(Long employeeId);
    List<EmployeeSeniorRequest> findByStatusOrderByRequestedAtDesc(EmployeeSeniorRequest.Status status);
    boolean existsByEmployeeIdAndStatus(Long employeeId, EmployeeSeniorRequest.Status status);
    List<EmployeeSeniorRequest> findAllByOrderByRequestedAtDesc();
}