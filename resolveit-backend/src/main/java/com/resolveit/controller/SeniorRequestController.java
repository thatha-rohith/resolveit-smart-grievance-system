package com.resolveit.controller;

import com.resolveit.dto.SeniorRequestDTO;
import com.resolveit.model.*;
import com.resolveit.repository.*;
import com.resolveit.service.SeniorRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/senior-requests")  // Changed from /api/senior-request
@RequiredArgsConstructor
public class SeniorRequestController {

    private final SeniorRequestService seniorRequestService;
    private final UserRepository userRepository;
    private final EmployeeSeniorRequestRepository seniorRequestRepository;

    // Employee submits request
    @PostMapping
    @Transactional
    public ResponseEntity<?> submitSeniorRequest(
            @RequestBody Map<String, String> request,
            Authentication authentication) {

        try {
            log.info("📝 Senior request received from: {}", authentication.getName());

            User employee = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (employee.getRole() != User.Role.EMPLOYEE) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Only employees can request senior role"
                ));
            }

            // Check if already has pending request
            boolean hasPending = seniorRequestRepository.existsByEmployeeIdAndStatus(
                    employee.getId(), EmployeeSeniorRequest.Status.PENDING);
            if (hasPending) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "You already have a pending request"
                ));
            }

            // Validate required fields
            String reason = request.get("reason");
            String qualifications = request.get("qualifications");
            String experience = request.get("experience");
            String additionalInfo = request.get("additionalInfo");

            if (reason == null || reason.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Reason is required"
                ));
            }

            // Check eligibility
            Map<String, Object> eligibility = seniorRequestService.checkEligibility(employee);
            boolean isEligible = (boolean) eligibility.get("eligible");

            if (!isEligible) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", eligibility.get("message"),
                        "details", eligibility
                ));
            }

            // Create senior request with all fields
            EmployeeSeniorRequest seniorRequest = new EmployeeSeniorRequest();
            seniorRequest.setEmployee(employee);
            seniorRequest.setReason(reason.trim());
            seniorRequest.setQualifications(qualifications != null ? qualifications.trim() : "");
            seniorRequest.setExperience(experience != null ? experience.trim() : "");
            seniorRequest.setAdditionalInfo(additionalInfo != null ? additionalInfo.trim() : "");
            seniorRequest.setStatus(EmployeeSeniorRequest.Status.PENDING);
            seniorRequest.setRequestedAt(LocalDateTime.now());
            seniorRequest.setResolutionRate((Double) eligibility.get("resolutionRate"));
            seniorRequest.setTotalComplaints((Integer) eligibility.get("totalComplaints"));
            seniorRequest.setResolvedComplaints((Integer) eligibility.get("resolvedComplaints"));

            EmployeeSeniorRequest savedRequest = seniorRequestRepository.save(seniorRequest);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Senior request submitted successfully",
                    "data", new SeniorRequestDTO(savedRequest),
                    "eligibility", eligibility
            ));

        } catch (Exception e) {
            log.error("❌ Error submitting senior request: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to submit senior request: " + e.getMessage()
            ));
        }
    }

    // Employee gets their request
    @GetMapping("/my-request")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMyRequest(Authentication authentication) {
        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (user.getRole() != User.Role.EMPLOYEE) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "data", null,
                        "message", "You are not an employee"
                ));
            }

            // Check for pending request
            var pendingRequest = seniorRequestRepository.findByEmployeeIdAndStatus(
                    user.getId(), EmployeeSeniorRequest.Status.PENDING);

            if (pendingRequest.isPresent()) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "data", new SeniorRequestDTO(pendingRequest.get())
                ));
            }

            // Get latest request if any
            List<EmployeeSeniorRequest> previousRequests = seniorRequestRepository
                    .findByEmployeeIdOrderByRequestedAtDesc(user.getId());

            if (!previousRequests.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "data", new SeniorRequestDTO(previousRequests.get(0))
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", null
            ));

        } catch (Exception e) {
            log.error("❌ Error getting request: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to get request: " + e.getMessage()
            ));
        }
    }

    // Employee cancels their pending request
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> cancelRequest(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            EmployeeSeniorRequest request = seniorRequestRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Request not found"));

            // Check ownership
            if (!request.getEmployee().getId().equals(user.getId())) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Not authorized to cancel this request"
                ));
            }

            // Check status
            if (request.getStatus() != EmployeeSeniorRequest.Status.PENDING) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Only pending requests can be cancelled"
                ));
            }

            seniorRequestRepository.delete(request);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Request cancelled successfully"
            ));

        } catch (Exception e) {
            log.error("❌ Error cancelling request: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to cancel request: " + e.getMessage()
            ));
        }
    }

    // Check eligibility
    @GetMapping("/eligibility")
    @Transactional(readOnly = true)
    public ResponseEntity<?> checkEligibility(Authentication authentication) {
        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (user.getRole() != User.Role.EMPLOYEE) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "eligible", false,
                        "message", "Only employees can request senior role"
                ));
            }

            Map<String, Object> eligibility = seniorRequestService.checkEligibility(user);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "eligible", eligibility.get("eligible"),
                    "details", eligibility
            ));

        } catch (Exception e) {
            log.error("❌ Error checking eligibility: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to check eligibility: " + e.getMessage()
            ));
        }
    }

    // ============= ADMIN ENDPOINTS =============

    // Get all requests (for admin)
    @GetMapping("/admin/all")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAllRequests(Authentication authentication) {
        try {
            User admin = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (admin.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Access denied"
                ));
            }

            List<EmployeeSeniorRequest> allRequests = seniorRequestRepository
                    .findAllByOrderByRequestedAtDesc();

            List<SeniorRequestDTO> dtos = allRequests.stream()
                    .map(SeniorRequestDTO::new)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", dtos,
                    "count", dtos.size()
            ));

        } catch (Exception e) {
            log.error("❌ Error fetching all requests: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to fetch requests: " + e.getMessage()
            ));
        }
    }

    // Get pending requests (for admin)
    @GetMapping("/admin/pending")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getPendingRequests(Authentication authentication) {
        try {
            User admin = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (admin.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Access denied"
                ));
            }

            List<EmployeeSeniorRequest> pendingRequests = seniorRequestRepository
                    .findByStatusOrderByRequestedAtDesc(EmployeeSeniorRequest.Status.PENDING);

            List<SeniorRequestDTO> dtos = pendingRequests.stream()
                    .map(SeniorRequestDTO::new)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", dtos,
                    "count", dtos.size()
            ));

        } catch (Exception e) {
            log.error("❌ Error fetching pending requests: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to fetch pending requests: " + e.getMessage()
            ));
        }
    }

    // Admin approves request
    @PutMapping("/admin/{id}/approve")
    @Transactional
    public ResponseEntity<?> approveRequest(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> requestBody,
            Authentication authentication) {

        try {
            User admin = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("Admin not found"));

            if (admin.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Access denied"
                ));
            }

            EmployeeSeniorRequest seniorRequest = seniorRequestRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Request not found"));

            if (seniorRequest.getStatus() != EmployeeSeniorRequest.Status.PENDING) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Request is not pending"
                ));
            }

            // Update user role to SENIOR_EMPLOYEE
            User employee = seniorRequest.getEmployee();
            employee.setRole(User.Role.SENIOR_EMPLOYEE);
            userRepository.save(employee);

            // Update request status
            seniorRequest.setStatus(EmployeeSeniorRequest.Status.APPROVED);
            seniorRequest.setReviewedAt(LocalDateTime.now());
            seniorRequest.setReviewedByAdminId(admin.getId());

            if (requestBody != null && requestBody.get("adminNotes") != null) {
                seniorRequest.setAdminNotes(requestBody.get("adminNotes"));
            }

            seniorRequestRepository.save(seniorRequest);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Senior request approved successfully",
                    "data", new SeniorRequestDTO(seniorRequest)
            ));

        } catch (Exception e) {
            log.error("❌ Error approving senior request: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to approve request: " + e.getMessage()
            ));
        }
    }

    // Admin rejects request
    @PutMapping("/admin/{id}/reject")
    @Transactional
    public ResponseEntity<?> rejectRequest(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> requestBody,
            Authentication authentication) {

        try {
            User admin = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("Admin not found"));

            if (admin.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Access denied"
                ));
            }

            EmployeeSeniorRequest seniorRequest = seniorRequestRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Request not found"));

            if (seniorRequest.getStatus() != EmployeeSeniorRequest.Status.PENDING) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Request is not pending"
                ));
            }

            // Update request status
            seniorRequest.setStatus(EmployeeSeniorRequest.Status.REJECTED);
            seniorRequest.setReviewedAt(LocalDateTime.now());
            seniorRequest.setReviewedByAdminId(admin.getId());

            if (requestBody != null && requestBody.get("adminNotes") != null) {
                seniorRequest.setAdminNotes(requestBody.get("adminNotes"));
            }

            seniorRequestRepository.save(seniorRequest);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Senior request rejected",
                    "data", new SeniorRequestDTO(seniorRequest)
            ));

        } catch (Exception e) {
            log.error("❌ Error rejecting senior request: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to reject request: " + e.getMessage()
            ));
        }
    }
}