package com.resolveit.controller;

import com.resolveit.model.EmployeeRequest;
import com.resolveit.model.User;
import com.resolveit.repository.EmployeeRequestRepository;
import com.resolveit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/employee-request")
@RequiredArgsConstructor
public class EmployeeRequestController {

    private final EmployeeRequestRepository employeeRequestRepo;
    private final UserRepository userRepo;

    @PostMapping
    @Transactional
    public ResponseEntity<?> submitEmployeeRequest(
            @RequestBody Map<String, String> request,
            Authentication authentication
    ) {
        try {
            log.info("📝 Employee request received from: {}", authentication.getName());

            if (request == null || request.get("reason") == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Reason is required"
                ));
            }

            String email = authentication.getName();
            User user = userRepo.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            log.info("👤 User found: {} (ID: {}, Role: {})",
                    user.getEmail(), user.getId(), user.getRole());

            // Check if user is already employee or admin
            if (user.getRole() == User.Role.EMPLOYEE || user.getRole() == User.Role.ADMIN) {
                log.warn("⚠️ User already has role: {}", user.getRole());
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "You are already an " + user.getRole().name().toLowerCase()
                ));
            }

            // Check if user already has a pending request
            boolean hasPendingRequest = employeeRequestRepo.existsByUserIdAndStatus(
                    user.getId(), EmployeeRequest.Status.PENDING);

            if (hasPendingRequest) {
                log.warn("⚠️ User already has pending request: {}", user.getEmail());
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "You already have a pending employee request"
                ));
            }

            // Create new employee request
            EmployeeRequest employeeRequest = new EmployeeRequest();
            employeeRequest.setUser(user);
            employeeRequest.setReason(request.get("reason"));
            employeeRequest.setStatus(EmployeeRequest.Status.PENDING);
            employeeRequest.setRequestedAt(LocalDateTime.now());

            EmployeeRequest savedRequest = employeeRequestRepo.save(employeeRequest);

            log.info("✅ Employee request created successfully: ID {}", savedRequest.getId());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Employee request submitted successfully",
                    "requestId", savedRequest.getId(),
                    "requestedAt", savedRequest.getRequestedAt()
            ));
        } catch (Exception e) {
            log.error("❌ Error submitting employee request: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to submit employee request: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/status")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getRequestStatus(Authentication authentication) {
        try {
            log.info("🔍 Checking employee request status for: {}", authentication.getName());

            String email = authentication.getName();
            User user = userRepo.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            log.info("👤 User: {} (ID: {}, Role: {})",
                    user.getEmail(), user.getId(), user.getRole());

            // Check if user is already employee or admin
            if (user.getRole() == User.Role.EMPLOYEE || user.getRole() == User.Role.ADMIN) {
                log.info("✅ User already has role: {}", user.getRole());
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "status", "ALREADY_" + user.getRole().name(),
                        "message", "You are already an " + user.getRole().name().toLowerCase(),
                        "role", user.getRole().name()
                ));
            }

            // Check for pending request
            var pendingRequest = employeeRequestRepo.findByUserIdAndStatus(
                    user.getId(), EmployeeRequest.Status.PENDING);

            if (pendingRequest.isPresent()) {
                EmployeeRequest req = pendingRequest.get();
                log.info("⏳ Found pending request: ID {}", req.getId());
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "status", "PENDING",
                        "requestId", req.getId(),
                        "requestedAt", req.getRequestedAt(),
                        "reason", req.getReason()
                ));
            }

            // Check for any previous requests (approved or rejected)
            List<EmployeeRequest> previousRequests = employeeRequestRepo.findAllByUserIdOrderByRequestedAtDesc(user.getId());

            if (!previousRequests.isEmpty()) {
                EmployeeRequest lastRequest = previousRequests.get(0);
                log.info("📋 Found previous request: ID {} with status {}",
                        lastRequest.getId(), lastRequest.getStatus());

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "status", lastRequest.getStatus().name(),
                        "requestId", lastRequest.getId(),
                        "requestedAt", lastRequest.getRequestedAt(),
                        "reviewedAt", lastRequest.getReviewedAt(),
                        "adminNotes", lastRequest.getAdminNotes()
                ));
            }

            log.info("📭 No employee request found for user: {}", user.getEmail());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "status", "NO_REQUEST",
                    "message", "No employee request found"
            ));
        } catch (Exception e) {
            log.error("❌ Error getting request status: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to get request status: " + e.getMessage()
            ));
        }
    }

    @PutMapping("/{id}/approve")
    @Transactional
    public ResponseEntity<?> approveEmployeeRequest(
            @PathVariable Long id,
            @RequestBody Map<String, Object> requestBody,
            Authentication authentication
    ) {
        try {
            log.info("✅ Approving employee request ID: {} by admin: {}", id, authentication.getName());

            // Find the employee request
            EmployeeRequest employeeRequest = employeeRequestRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Employee request not found"));

            if (employeeRequest.getStatus() != EmployeeRequest.Status.PENDING) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Request is not in pending status"
                ));
            }

            // Get the user
            User user = employeeRequest.getUser();

            // In the approve method, update the role setting logic:
            if (requestBody != null && requestBody.containsKey("role")) {
                String requestedRole = requestBody.get("role").toString();
                try {
                    User.Role role = User.Role.valueOf(requestedRole.toUpperCase());
                    user.setRole(role);
                } catch (IllegalArgumentException e) {
                    user.setRole(User.Role.EMPLOYEE);
                }
            } else {
                user.setRole(User.Role.EMPLOYEE);
            }

            // Update the employee request
            employeeRequest.setStatus(EmployeeRequest.Status.APPROVED);
            employeeRequest.setReviewedAt(LocalDateTime.now());

            if (requestBody != null && requestBody.containsKey("adminNotes")) {
                employeeRequest.setAdminNotes(requestBody.get("adminNotes").toString());
            }

            // Save changes
            userRepo.save(user);
            employeeRequestRepo.save(employeeRequest);

            log.info("🎉 Employee request approved. User {} upgraded to role: {}",
                    user.getEmail(), user.getRole());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Employee request approved successfully",
                    "userId", user.getId(),
                    "newRole", user.getRole().name(),
                    "requestId", employeeRequest.getId()
            ));
        } catch (Exception e) {
            log.error("❌ Error approving employee request: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to approve employee request: " + e.getMessage()
            ));
        }
    }
}