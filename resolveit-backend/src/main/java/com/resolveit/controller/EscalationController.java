package com.resolveit.controller;

import com.resolveit.dto.EscalationRequest;
import com.resolveit.model.Complaint;
import com.resolveit.model.User;
import com.resolveit.repository.UserRepository;
import com.resolveit.service.EscalationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class EscalationController {

    private final EscalationService escalationService;
    private final UserRepository userRepository;

    @PostMapping("/complaints/{id}/escalate")
    public ResponseEntity<?> escalateComplaint(
            @PathVariable Long id,
            @RequestBody EscalationRequest request,
            Authentication authentication) {

        log.info("📤 Escalation request for complaint {} by {}", id, authentication.getName());

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != User.Role.ADMIN && user.getRole() != User.Role.SENIOR_EMPLOYEE) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "error", "Only admins and senior employees can escalate complaints"
            ));
        }

        Complaint escalated = escalationService.escalateComplaint(id, request, user);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Complaint escalated successfully",
                "complaintId", escalated.getId(),
                "escalatedTo", escalated.getEscalatedTo().getFullName(),
                "escalationReason", escalated.getEscalationReason()
        ));
    }

    @GetMapping("/escalated-complaints")
    public ResponseEntity<?> getEscalatedComplaints(Authentication authentication) {
        log.info("📥 Getting escalated complaints for user: {}", authentication.getName());

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Allow employees, senior employees, and admins
        if (user.getRole() != User.Role.EMPLOYEE &&
                user.getRole() != User.Role.SENIOR_EMPLOYEE &&
                user.getRole() != User.Role.ADMIN) {
            log.warn("❌ Access denied for user role: {}", user.getRole());
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "error", "Access denied. Only employees and above can view escalated complaints"
            ));
        }

        List<Complaint> escalatedComplaints;

        if (user.getRole() == User.Role.EMPLOYEE) {
            // Employees can see complaints escalated to them
            log.info("👤 Employee {} fetching complaints escalated to them", user.getEmail());
            escalatedComplaints = escalationService.getEscalatedComplaints(user);
        } else {
            // Admins and senior employees can see all escalated complaints
            log.info("👤 Admin/Senior {} fetching all escalated complaints", user.getEmail());
            escalatedComplaints = escalationService.getAllEscalatedComplaints(); // This is the fixed method
        }

        log.info("✅ Found {} escalated complaints for user {}", escalatedComplaints.size(), user.getEmail());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", escalatedComplaints,
                "count", escalatedComplaints.size(),
                "userRole", user.getRole().name()
        ));
    }

    @GetMapping("/complaints/requiring-escalation")
    public ResponseEntity<?> getComplaintsRequiringEscalation(Authentication authentication) {
        log.info("📥 Getting complaints requiring escalation for user: {}", authentication.getName());

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != User.Role.ADMIN) {
            log.warn("❌ Access denied for non-admin user role: {}", user.getRole());
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "error", "Only admins can view complaints requiring escalation"
            ));
        }

        List<Complaint> complaints = escalationService.getComplaintsRequiringEscalation();

        log.info("✅ Found {} complaints requiring escalation", complaints.size());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", complaints,
                "count", complaints.size()
        ));
    }

    @GetMapping("/escalation/stats")
    public ResponseEntity<?> getEscalationStats(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != User.Role.ADMIN && user.getRole() != User.Role.SENIOR_EMPLOYEE) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "error", "Only admins and senior employees can view escalation stats"
            ));
        }

        Map<String, Object> stats = escalationService.getSeniorEmployeeLoad();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", stats
        ));
    }
}