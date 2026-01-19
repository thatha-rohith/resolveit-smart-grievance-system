package com.resolveit.controller;

import com.resolveit.service.EscalationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/escalation")
@RequiredArgsConstructor
@Slf4j
public class EscalationTestController {

    private final EscalationService escalationService;

    @PostMapping("/trigger-auto")
    public ResponseEntity<?> triggerAutoEscalation(Authentication authentication) {
        try {
            log.info("🚀 Manual trigger of auto-escalation by {}", authentication.getName());

            escalationService.checkAndAutoEscalateComplaints();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Auto-escalation triggered successfully"
            ));
        } catch (Exception e) {
            log.error("❌ Error triggering auto-escalation: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to trigger auto-escalation: " + e.getMessage()
            ));
        }
    }

    @PostMapping("/check-status")
    public ResponseEntity<?> checkEscalationStatus() {
        try {
            var complaints = escalationService.getComplaintsRequiringEscalation();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "count", complaints.size(),
                    "complaints", complaints.stream()
                            .map(c -> Map.of(
                                    "id", c.getId(),
                                    "title", c.getTitle(),
                                    "status", c.getStatus(),
                                    "createdAt", c.getCreatedAt(),
                                    "daysOpen", c.getDaysSinceCreation(),
                                    "assignedTo", c.getAssignedEmployee() != null ?
                                            c.getAssignedEmployee().getEmail() : "Unassigned",
                                    "requiresEscalation", c.getRequiresEscalation()
                            ))
                            .collect(java.util.stream.Collectors.toList())
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
}