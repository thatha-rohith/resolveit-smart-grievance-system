package com.resolveit.controller;

import com.resolveit.dto.ComplaintResponseDTO;
import com.resolveit.model.*;
import com.resolveit.repository.*;
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
@RequestMapping("/employee/complaints")
@RequiredArgsConstructor
public class EmployeeComplaintController {

    private final ComplaintRepository complaintRepo;
    private final UserRepository userRepo;
    private final StatusLogRepository statusLogRepo;
    private final AttachmentRepository attachmentRepo;
    private final ComplaintCommentRepository commentRepo;
    private final ComplaintLikeRepository likeRepo;

    // Get assigned complaints
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAssignedComplaints(Authentication authentication) {
        try {
            User employee = userRepo.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("Employee not found"));

            if (employee.getRole() != User.Role.EMPLOYEE && employee.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", "Access denied",
                        "message", "Only employees can access this endpoint"
                ));
            }

            List<Complaint> assignedComplaints = complaintRepo.findByAssignedEmployee(employee);
            List<ComplaintResponseDTO> complaintDTOs = assignedComplaints.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(complaintDTOs);
        } catch (Exception e) {
            log.error("Error fetching assigned complaints: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to fetch assigned complaints",
                    "message", e.getMessage()
            ));
        }
    }

    // Update complaint status - FIXED VERSION
    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<?> updateComplaintStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestBody(required = false) Map<String, Object> requestBody,
            Authentication authentication
    ) {
        try {
            log.info("📝 Employee updating complaint {} status to: {}", id, status);

            User employee = userRepo.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("Employee not found"));

            // Check if user is employee or admin
            if (employee.getRole() != User.Role.EMPLOYEE && employee.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Access denied",
                        "message", "Only employees can update complaint status"
                ));
            }

            Complaint complaint = complaintRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Complaint not found with id: " + id));

            // Check if complaint is assigned to this employee (unless admin)
            if (employee.getRole() != User.Role.ADMIN) {
                if (complaint.getAssignedEmployee() == null) {
                    return ResponseEntity.status(403).body(Map.of(
                            "success", false,
                            "error", "Access denied",
                            "message", "Complaint is not assigned to any employee"
                    ));
                }

                if (!complaint.getAssignedEmployee().getId().equals(employee.getId())) {
                    return ResponseEntity.status(403).body(Map.of(
                            "success", false,
                            "error", "Access denied",
                            "message", "You can only update complaints assigned to you"
                    ));
                }
            }

            // Validate status parameter
            ComplaintState newStatus;
            try {
                // Convert string to enum, handle case differences
                String statusUpper = status.trim().toUpperCase();
                newStatus = ComplaintState.valueOf(statusUpper);
            } catch (IllegalArgumentException e) {
                log.error("Invalid status value: {}", status);
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Invalid status",
                        "message", "Valid statuses are: NEW, UNDER_REVIEW, RESOLVED",
                        "received", status
                ));
            }

            // Update complaint status
            complaint.setStatus(newStatus);
            complaint.setUpdatedAt(LocalDateTime.now());
            Complaint savedComplaint = complaintRepo.save(complaint);

            // Create status log entry
            String comment = null;
            Boolean internalNote = false;

            if (requestBody != null) {
                if (requestBody.get("comment") != null) {
                    comment = requestBody.get("comment").toString();
                }
                if (requestBody.get("internalNote") != null) {
                    try {
                        internalNote = Boolean.parseBoolean(requestBody.get("internalNote").toString());
                    } catch (Exception e) {
                        log.warn("Invalid internalNote value: {}", requestBody.get("internalNote"));
                    }
                }
            }

            StatusLog logEntry = new StatusLog();
            logEntry.setStatus(newStatus);
            logEntry.setComment(comment != null ? comment : "Status updated to " + newStatus + " by employee");
            logEntry.setInternalNote(internalNote);
            logEntry.setComplaint(savedComplaint);
            logEntry.setUpdatedBy(employee);
            logEntry.setUpdatedAt(LocalDateTime.now());

            StatusLog savedLog = statusLogRepo.save(logEntry);

            log.info("✅ Complaint {} status updated to {} by employee {}",
                    id, newStatus, employee.getEmail());

            // Return updated complaint data
            ComplaintResponseDTO dto = convertToDTO(savedComplaint);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Complaint status updated successfully",
                    "complaint", dto,
                    "statusLogId", savedLog.getId()
            ));
        } catch (Exception e) {
            log.error("❌ Error updating complaint status: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to update complaint status",
                    "message", e.getMessage(),
                    "details", e.toString()
            ));
        }
    }

    // Get complaint details
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getComplaintDetails(@PathVariable Long id, Authentication authentication) {
        try {
            User employee = userRepo.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("Employee not found"));

            if (employee.getRole() != User.Role.EMPLOYEE && employee.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", "Access denied",
                        "message", "Only employees can access this endpoint"
                ));
            }

            Complaint complaint = complaintRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Complaint not found"));

            // Check if complaint is assigned to this employee (unless admin)
            if (employee.getRole() != User.Role.ADMIN) {
                if (complaint.getAssignedEmployee() == null ||
                        !complaint.getAssignedEmployee().getId().equals(employee.getId())) {
                    return ResponseEntity.status(403).body(Map.of(
                            "error", "Access denied",
                            "message", "You can only view complaints assigned to you"
                    ));
                }
            }

            ComplaintResponseDTO dto = convertToDTO(complaint);
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            log.error("Error fetching complaint details: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to fetch complaint details",
                    "message", e.getMessage()
            ));
        }
    }

    // Helper method to convert Complaint to DTO
    private ComplaintResponseDTO convertToDTO(Complaint complaint) {
        ComplaintResponseDTO dto = new ComplaintResponseDTO();
        dto.setId(complaint.getId());
        dto.setTitle(complaint.getTitle());
        dto.setCategory(complaint.getCategory());
        dto.setDescription(complaint.getDescription());
        dto.setStatus(complaint.getStatus());
        dto.setUrgency(complaint.getUrgency());
        dto.setAnonymous(complaint.getAnonymous());
        dto.setIsPublic(complaint.getIsPublic());
        dto.setCreatedAt(complaint.getCreatedAt());
        dto.setUpdatedAt(complaint.getUpdatedAt());

        if (complaint.getUser() != null) {
            dto.setUserId(complaint.getUser().getId());
            dto.setUserFullName(complaint.getUser().getFullName());
            dto.setUserEmail(complaint.getUser().getEmail());
        }

        if (complaint.getAssignedEmployee() != null) {
            dto.setAssignedEmployeeId(complaint.getAssignedEmployee().getId());
            dto.setAssignedEmployeeName(complaint.getAssignedEmployee().getFullName());
        }

        if (complaint.getId() != null) {
            try {
                dto.setAttachmentCount(attachmentRepo.countByComplaintId(complaint.getId()));
                dto.setCommentCount(commentRepo.countByComplaintId(complaint.getId()));
                dto.setLikeCount(likeRepo.countByComplaintId(complaint.getId()));
            } catch (Exception e) {
                log.error("Error getting counts for complaint {}: {}", complaint.getId(), e.getMessage());
                dto.setAttachmentCount(0L);
                dto.setCommentCount(0L);
                dto.setLikeCount(0L);
            }
        } else {
            dto.setAttachmentCount(0L);
            dto.setCommentCount(0L);
            dto.setLikeCount(0L);
        }

        return dto;
    }
}