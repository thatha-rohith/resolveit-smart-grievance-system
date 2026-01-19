package com.resolveit.controller;

import com.resolveit.dto.EmployeeRequestResponse;
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
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/admin/employee-requests")
@RequiredArgsConstructor
public class AdminEmployeeRequestController {

    private final EmployeeRequestRepository requestRepo;
    private final UserRepository userRepo;

    // View all pending requests
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> pendingRequests() {
        try {
            log.info("📋 Fetching pending employee requests");
            List<EmployeeRequest> requests = requestRepo.findByStatusOrderByRequestedAtDesc(EmployeeRequest.Status.PENDING);

            if (requests.isEmpty()) {
                log.info("📭 No pending requests found");
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "requests", List.of(),
                        "count", 0,
                        "message", "No pending requests"
                ));
            }

            List<EmployeeRequestResponse> response = requests.stream()
                    .map(EmployeeRequestResponse::new)
                    .collect(Collectors.toList());

            log.info("✅ Found {} pending requests", response.size());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "requests", response,
                    "count", response.size()
            ));
        } catch (Exception e) {
            log.error("❌ Error fetching pending requests: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to fetch pending requests: " + e.getMessage()
            ));
        }
    }

    // View all requests
    @GetMapping("/all")
    @Transactional(readOnly = true)
    public ResponseEntity<?> allRequests() {
        try {
            log.info("📋 Fetching all employee requests");
            List<EmployeeRequest> requests = requestRepo.findAllByOrderByRequestedAtDesc();

            if (requests.isEmpty()) {
                log.info("📭 No employee requests found");
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "requests", List.of(),
                        "count", 0,
                        "message", "No employee requests"
                ));
            }

            List<EmployeeRequestResponse> response = requests.stream()
                    .map(EmployeeRequestResponse::new)
                    .collect(Collectors.toList());

            log.info("✅ Found {} total requests", response.size());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "requests", response,
                    "count", response.size()
            ));
        } catch (Exception e) {
            log.error("❌ Error fetching all requests: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to fetch requests: " + e.getMessage()
            ));
        }
    }

    // APPROVE - Updated to handle senior employee role
    @PutMapping("/{id}/approve")
    @Transactional
    public ResponseEntity<?> approve(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> requestBody,
            Authentication authentication
    ) {
        try {
            log.info("✅ Approving employee request ID: {}", id);

            User admin = userRepo.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("Admin not found"));

            EmployeeRequest req = requestRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Request not found with ID: " + id));

            if (req.getStatus() != EmployeeRequest.Status.PENDING) {
                log.warn("⚠️ Request {} is not pending, status: {}", id, req.getStatus());
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Request is not pending. Current status: " + req.getStatus()
                ));
            }

            User user = req.getUser();

            if (user == null) {
                log.error("❌ Request {} has no associated user", id);
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "No user associated with this request"
                ));
            }

            // Determine role from request body or default to EMPLOYEE
            User.Role roleToAssign = User.Role.EMPLOYEE;

            if (requestBody != null && requestBody.containsKey("role")) {
                String requestedRole = requestBody.get("role").toUpperCase();
                try {
                    roleToAssign = User.Role.valueOf(requestedRole);
                    log.info("📋 Assigning role: {}", roleToAssign);
                } catch (IllegalArgumentException e) {
                    log.warn("⚠️ Invalid role requested: {}, defaulting to EMPLOYEE", requestedRole);
                    roleToAssign = User.Role.EMPLOYEE;
                }
            }

            // Set the determined role
            user.setRole(roleToAssign);
            User savedUser = userRepo.save(user);

            // Update request status
            req.setStatus(EmployeeRequest.Status.APPROVED);
            req.setReviewedAt(LocalDateTime.now());
            req.setReviewedByAdminId(admin.getId());

            // Store assigned role in admin notes
            String currentNotes = req.getAdminNotes() != null ? req.getAdminNotes() + "\n" : "";
            req.setAdminNotes(currentNotes + "Assigned role: " + roleToAssign.name());

            EmployeeRequest savedRequest = requestRepo.save(req);

            log.info("✅ Request approved. User {} (ID: {}) is now a {}.",
                    savedUser.getEmail(), savedUser.getId(), roleToAssign.name().toLowerCase());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Request approved. User is now a " + roleToAssign.name().toLowerCase() + ".",
                    "user", Map.of(
                            "id", savedUser.getId(),
                            "email", savedUser.getEmail(),
                            "fullName", savedUser.getFullName(),
                            "role", savedUser.getRole().name()
                    ),
                    "request", new EmployeeRequestResponse(savedRequest)
            ));
        } catch (Exception e) {
            log.error("❌ Error approving request ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to approve request: " + e.getMessage()
            ));
        }
    }

    // REJECT
    @PutMapping("/{id}/reject")
    @Transactional
    public ResponseEntity<?> reject(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> requestBody,
            Authentication authentication
    ) {
        try {
            log.info("❌ Rejecting employee request ID: {}", id);

            User admin = userRepo.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("Admin not found"));

            EmployeeRequest req = requestRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Request not found with ID: " + id));

            if (req.getStatus() != EmployeeRequest.Status.PENDING) {
                log.warn("⚠️ Request {} is not pending, status: {}", id, req.getStatus());
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Request is not pending. Current status: " + req.getStatus()
                ));
            }

            // Update request status
            req.setStatus(EmployeeRequest.Status.REJECTED);
            req.setReviewedAt(LocalDateTime.now());
            req.setReviewedByAdminId(admin.getId());

            // Add admin notes if provided
            if (requestBody != null && requestBody.get("adminNotes") != null) {
                String notes = requestBody.get("adminNotes");
                if (!notes.trim().isEmpty()) {
                    req.setAdminNotes(notes);
                    log.info("📝 Added admin notes to request {}: {}", id, notes);
                }
            }

            EmployeeRequest savedRequest = requestRepo.save(req);

            log.info("✅ Request rejected: ID {}", id);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Request rejected.",
                    "request", new EmployeeRequestResponse(savedRequest)
            ));
        } catch (Exception e) {
            log.error("❌ Error rejecting request ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to reject request: " + e.getMessage()
            ));
        }
    }
}