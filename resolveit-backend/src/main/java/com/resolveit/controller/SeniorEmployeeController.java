package com.resolveit.controller;

import com.resolveit.model.Complaint;
import com.resolveit.model.User;
import com.resolveit.repository.ComplaintRepository;
import com.resolveit.repository.UserRepository;
import com.resolveit.service.EscalationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/senior")
@RequiredArgsConstructor
@Slf4j
public class SeniorEmployeeController {

    private final EscalationService escalationService;
    private final UserRepository userRepository;
    private final ComplaintRepository complaintRepository;

    @GetMapping("/escalated/all")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAllEscalatedComplaints(Authentication authentication) {
        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (user.getRole() != User.Role.SENIOR_EMPLOYEE && user.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Only senior employees and admins can view all escalated complaints"
                ));
            }

            List<Complaint> escalatedComplaints = escalationService.getAllEscalatedComplaints();

            List<Map<String, Object>> complaintData = escalatedComplaints.stream()
                    .map(complaint -> {
                        Map<String, Object> data = new HashMap<>();
                        data.put("id", complaint.getId());
                        data.put("title", complaint.getTitle());
                        data.put("category", complaint.getCategory());
                        data.put("status", complaint.getStatus().name());
                        data.put("urgency", complaint.getUrgency().name());
                        data.put("createdAt", complaint.getCreatedAt());
                        data.put("escalationDate", complaint.getEscalationDate());
                        data.put("escalationReason", complaint.getEscalationReason());

                        if (complaint.getEscalatedTo() != null) {
                            data.put("escalatedToId", complaint.getEscalatedTo().getId());
                            data.put("escalatedToName", complaint.getEscalatedTo().getFullName());
                            data.put("escalatedToEmail", complaint.getEscalatedTo().getEmail());
                        }

                        if (complaint.getUser() != null && !complaint.getAnonymous()) {
                            data.put("userName", complaint.getUser().getFullName());
                            data.put("userEmail", complaint.getUser().getEmail());
                        }

                        data.put("daysOpen", complaint.getDaysOpen());
                        data.put("requiresEscalation", complaint.getRequiresEscalation());

                        return data;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", complaintData,
                    "count", complaintData.size(),
                    "message", "All escalated complaints retrieved successfully"
            ));
        } catch (Exception e) {
            log.error("Error fetching all escalated complaints: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to fetch escalated complaints: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/escalated/my")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMyEscalatedComplaints(Authentication authentication) {
        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (user.getRole() != User.Role.SENIOR_EMPLOYEE && user.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Only senior employees and admins can view escalated complaints"
                ));
            }

            List<Complaint> escalatedComplaints = escalationService.getEscalatedComplaints(user);

            List<Map<String, Object>> complaintData = escalatedComplaints.stream()
                    .map(complaint -> {
                        Map<String, Object> data = new HashMap<>();
                        data.put("id", complaint.getId());
                        data.put("title", complaint.getTitle());
                        data.put("category", complaint.getCategory());
                        data.put("description", complaint.getDescription());
                        data.put("status", complaint.getStatus().name());
                        data.put("urgency", complaint.getUrgency().name());
                        data.put("createdAt", complaint.getCreatedAt());
                        data.put("escalationDate", complaint.getEscalationDate());
                        data.put("escalationReason", complaint.getEscalationReason());
                        data.put("daysOpen", complaint.getDaysOpen());

                        if (complaint.getUser() != null && !complaint.getAnonymous()) {
                            data.put("userName", complaint.getUser().getFullName());
                            data.put("userEmail", complaint.getUser().getEmail());
                        }

                        // Original assigned employee (if any)
                        if (complaint.getAssignedEmployee() != null) {
                            data.put("originalAssignedId", complaint.getAssignedEmployee().getId());
                            data.put("originalAssignedName", complaint.getAssignedEmployee().getFullName());
                        }

                        return data;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", complaintData,
                    "count", complaintData.size(),
                    "userName", user.getFullName(),
                    "userRole", user.getRole().name(),
                    "message", "Escalated complaints retrieved successfully"
            ));
        } catch (Exception e) {
            log.error("Error fetching my escalated complaints: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to fetch escalated complaints: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/load-distribution")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getSeniorLoadDistribution(Authentication authentication) {
        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (user.getRole() != User.Role.SENIOR_EMPLOYEE && user.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Only senior employees and admins can view load distribution"
                ));
            }

            Map<String, Object> loadStats = escalationService.getSeniorEmployeeLoad();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", loadStats,
                    "message", "Senior employee load distribution retrieved successfully"
            ));
        } catch (Exception e) {
            log.error("Error fetching load distribution: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to fetch load distribution: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/complaints/{id}/deescalate")
    @Transactional
    public ResponseEntity<?> deescalateComplaint(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> requestBody,
            Authentication authentication) {
        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (user.getRole() != User.Role.SENIOR_EMPLOYEE && user.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Only senior employees and admins can de-escalate complaints"
                ));
            }

            Complaint complaint = complaintRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Complaint not found"));

            // Check if complaint is escalated to this user
            if (complaint.getEscalatedTo() == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Complaint is not escalated"
                ));
            }

            if (!complaint.getEscalatedTo().getId().equals(user.getId())) {
                if (user.getRole() != User.Role.ADMIN) {
                    return ResponseEntity.status(403).body(Map.of(
                            "success", false,
                            "error", "You can only de-escalate complaints escalated to you"
                    ));
                }
            }

            // Remove escalation
            String deescalationReason = "De-escalated by " + user.getFullName();
            if (requestBody != null && requestBody.get("reason") != null) {
                deescalationReason += ": " + requestBody.get("reason");
            }

            complaint.setEscalatedTo(null);
            complaint.setEscalationDate(null);
            complaint.setEscalationReason(deescalationReason);
            complaint.setUpdatedAt(java.time.LocalDateTime.now());

            complaintRepository.save(complaint);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Complaint de-escalated successfully",
                    "complaintId", id
            ));
        } catch (Exception e) {
            log.error("Error de-escalating complaint: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to de-escalate complaint: " + e.getMessage()
            ));
        }
    }
}