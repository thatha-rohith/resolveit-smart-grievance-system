package com.resolveit.controller;

import com.resolveit.dto.ComplaintRequest;
import com.resolveit.dto.ComplaintResponseDTO;
import com.resolveit.model.*;
import com.resolveit.repository.*;
import com.resolveit.security.JwtService;
import com.resolveit.service.EscalationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/complaints")
@RequiredArgsConstructor
@Transactional
@CrossOrigin(origins = "http://localhost:3000", maxAge = 3600, allowCredentials = "true")
public class ComplaintController {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final AttachmentRepository attachmentRepository;
    private final ComplaintCommentRepository commentRepository;
    private final ComplaintLikeRepository likeRepository;
    private final EscalationService escalationService;
    private final StatusLogRepository statusLogRepository;

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            "jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "txt"
    );
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final String UPLOAD_DIR = "uploads";

    @PostMapping("/submit")
    @Transactional
    public ResponseEntity<?> submitComplaint(
            @Valid @RequestBody ComplaintRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            BindingResult bindingResult
    ) {
        try {
            // Validate request
            if (bindingResult.hasErrors()) {
                Map<String, String> errors = new HashMap<>();
                bindingResult.getFieldErrors().forEach(error ->
                        errors.put(error.getField(), error.getDefaultMessage()));
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Validation failed",
                        "errors", errors
                ));
            }

            // For anonymous complaints, no auth needed
            User dbUser = null;
            if (!request.getAnonymous()) {
                if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                    return ResponseEntity.status(401).body(Map.of(
                            "success", false,
                            "error", "No token provided for non-anonymous complaint"
                    ));
                }

                String token = authHeader.substring(7);
                String email = jwtService.extractUsername(token);

                if (email == null) {
                    return ResponseEntity.status(401).body(Map.of(
                            "success", false,
                            "error", "Invalid token"
                    ));
                }

                dbUser = userRepository.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));
            }

            Complaint complaint = new Complaint();
            complaint.setTitle(request.getTitle());
            complaint.setCategory(request.getCategory());
            complaint.setDescription(request.getDescription());
            complaint.setUrgency(request.getUrgency());
            complaint.setAnonymous(request.getAnonymous());

            // Only set user if not anonymous
            if (!complaint.getAnonymous() && dbUser != null) {
                complaint.setUser(dbUser);
            } else {
                complaint.setUser(null); // Ensure user is null for anonymous complaints
            }

            complaint.setStatus(ComplaintState.NEW);
            complaint.setCreatedAt(LocalDateTime.now());
            complaint.setUpdatedAt(LocalDateTime.now());
            complaint.setIsPublic(!complaint.getAnonymous());

            Complaint savedComplaint = complaintRepository.save(complaint);
            ComplaintResponseDTO responseDTO = convertToDTO(savedComplaint);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Complaint submitted successfully",
                    "complaint", responseDTO
            ));
        } catch (Exception e) {
            log.error("Failed to submit complaint", e);
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "error", "Failed to submit complaint: " + e.getMessage()));
        }
    }

    // Submit complaint with attachments
    @PostMapping(value = "/submit-with-attachments", consumes = {"multipart/form-data"})
    @Transactional
    public ResponseEntity<?> submitComplaintWithAttachments(
            @RequestParam("title") String title,
            @RequestParam("category") String category,
            @RequestParam("description") String description,
            @RequestParam("urgency") Urgency urgency,
            @RequestParam(value = "anonymous", required = false, defaultValue = "false") Boolean anonymous,
            @RequestParam(value = "files", required = false) MultipartFile[] files,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        try {
            log.info("📤 Submitting complaint with attachments: {}", title);

            // For non-anonymous complaints, validate token
            User dbUser = null;
            if (!anonymous) {
                if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                    return ResponseEntity.status(401).body(Map.of(
                            "success", false,
                            "error", "No token provided for non-anonymous complaint"
                    ));
                }

                String token = authHeader.substring(7);
                String email = jwtService.extractUsername(token);

                if (email == null) {
                    return ResponseEntity.status(401).body(Map.of(
                            "success", false,
                            "error", "Invalid token"
                    ));
                }

                dbUser = userRepository.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));
            }

            // Validate required fields
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Title is required"
                ));
            }

            if (category == null || category.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Category is required"
                ));
            }

            if (description == null || description.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Description is required"
                ));
            }

            if (urgency == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Urgency is required"
                ));
            }

            // Create complaint
            Complaint complaint = new Complaint();
            complaint.setTitle(title.trim());
            complaint.setCategory(category.trim());
            complaint.setDescription(description.trim());
            complaint.setUrgency(urgency);
            complaint.setAnonymous(anonymous);

            // Only set user if not anonymous
            if (!complaint.getAnonymous() && dbUser != null) {
                complaint.setUser(dbUser);
            } else {
                complaint.setUser(null); // Ensure user is null for anonymous complaints
            }

            complaint.setStatus(ComplaintState.NEW);
            complaint.setCreatedAt(LocalDateTime.now());
            complaint.setUpdatedAt(LocalDateTime.now());
            complaint.setIsPublic(!complaint.getAnonymous());

            Complaint savedComplaint = complaintRepository.save(complaint);
            log.info("✅ Complaint created with ID: {}", savedComplaint.getId());

            List<Map<String, Object>> uploadedAttachments = new ArrayList<>();

            // Process attachments if any
            if (files != null && files.length > 0) {
                log.info("📁 Processing {} files", files.length);

                // Create upload directory if it doesn't exist
                File uploadDir = new File(UPLOAD_DIR);
                if (!uploadDir.exists()) {
                    uploadDir.mkdirs();
                }

                for (MultipartFile file : files) {
                    if (file.isEmpty()) {
                        continue;
                    }

                    // Validate file size
                    if (file.getSize() > MAX_FILE_SIZE) {
                        return ResponseEntity.badRequest().body(Map.of(
                                "success", false,
                                "error", "File '" + file.getOriginalFilename() + "' exceeds 10MB limit"
                        ));
                    }

                    // Validate file extension
                    String originalFilename = file.getOriginalFilename();
                    String extension = "";
                    if (originalFilename != null && originalFilename.contains(".")) {
                        extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
                    }

                    if (!ALLOWED_EXTENSIONS.contains(extension)) {
                        return ResponseEntity.badRequest().body(Map.of(
                                "success", false,
                                "error", "File type '" + extension + "' not allowed for '" + originalFilename + "'. Allowed: " + String.join(", ", ALLOWED_EXTENSIONS)
                        ));
                    }

                    // Generate unique filename
                    String uniqueFilename = System.currentTimeMillis() + "_" +
                            UUID.randomUUID().toString().substring(0, 8) + "_" +
                            originalFilename.replaceAll("[^a-zA-Z0-9.-]", "_");
                    Path destPath = Paths.get(uploadDir.getAbsolutePath(), uniqueFilename);

                    // Save file
                    Files.copy(file.getInputStream(), destPath);

                    // Save attachment record
                    Attachment attachment = new Attachment();
                    attachment.setFilename(originalFilename);
                    attachment.setFilePath(destPath.toAbsolutePath().toString());
                    attachment.setComplaint(savedComplaint);
                    attachment.setUploadedAt(LocalDateTime.now());

                    Attachment savedAttachment = attachmentRepository.save(attachment);
                    log.info("✅ File saved: {}", originalFilename);

                    // Add to response
                    Map<String, Object> attachmentInfo = new HashMap<>();
                    attachmentInfo.put("id", savedAttachment.getId());
                    attachmentInfo.put("filename", savedAttachment.getFilename());
                    attachmentInfo.put("uploadedAt", savedAttachment.getUploadedAt());
                    attachmentInfo.put("fileSize", file.getSize());
                    uploadedAttachments.add(attachmentInfo);
                }

                // Update complaint attachment count
                long attachmentCount = attachmentRepository.countByComplaintId(savedComplaint.getId());
                savedComplaint.setAttachmentCount(attachmentCount);
                complaintRepository.save(savedComplaint);
            }

            ComplaintResponseDTO responseDTO = convertToDTO(savedComplaint);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Complaint submitted successfully");
            response.put("complaint", responseDTO);
            response.put("attachments", uploadedAttachments);
            response.put("attachmentCount", uploadedAttachments.size());

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            log.error("❌ File upload error: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to save files: " + e.getMessage()
            ));
        } catch (Exception e) {
            log.error("❌ Failed to submit complaint with attachments", e);
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Failed to submit complaint: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/my")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMyComplaints(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(401).body(Map.of("error", "No token provided"));
            }

            String token = authHeader.substring(7);
            String email = jwtService.extractUsername(token);

            if (email == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
            }

            User dbUser = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Get only non-anonymous complaints for this user
            List<Complaint> complaints = complaintRepository.findByUserAndAnonymousFalse(dbUser);

            List<ComplaintResponseDTO> complaintDTOs = complaints.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", complaintDTOs,
                    "count", complaintDTOs.size()
            ));
        } catch (Exception e) {
            log.error("Failed to fetch user complaints", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to fetch complaints: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getComplaintById(@PathVariable Long id) {
        try {
            Complaint complaint = complaintRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Complaint not found"));

            ComplaintResponseDTO responseDTO = convertToDTO(complaint);
            return ResponseEntity.ok(responseDTO);
        } catch (Exception e) {
            log.error("Failed to fetch complaint by id: {}", id, e);
            return ResponseEntity.notFound().build();
        }
    }

    // Status update endpoint
    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<?> updateComplaintStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestBody(required = false) Map<String, Object> requestBody,
            Authentication authentication) {
        try {
            log.info("📝 Updating complaint {} status to: {}", id, status);

            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Complaint complaint = complaintRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Complaint not found with id: " + id));

            // Validate user can update this complaint
            if (!canUpdateComplaint(complaint, user)) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Access denied",
                        "message", "You are not authorized to update this complaint"
                ));
            }

            // Validate status parameter
            ComplaintState newStatus;
            try {
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

            // If complaint is resolved, clear escalation if exists
            if (newStatus == ComplaintState.RESOLVED && complaint.getEscalatedTo() != null) {
                complaint.setEscalatedTo(null);
                complaint.setEscalationDate(null);
                complaint.setRequiresEscalation(false);
            }

            Complaint savedComplaint = complaintRepository.save(complaint);

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
            logEntry.setComment(comment != null ? comment : "Status updated to " + newStatus + " by " + user.getRole());
            logEntry.setInternalNote(internalNote != null ? internalNote : false);
            logEntry.setComplaint(savedComplaint);
            logEntry.setUpdatedBy(user);
            logEntry.setUpdatedAt(LocalDateTime.now());

            StatusLog savedLog = statusLogRepository.save(logEntry);

            log.info("✅ Complaint {} status updated to {} by {} ({})",
                    id, newStatus, user.getEmail(), user.getRole());

            // Return updated complaint data
            ComplaintResponseDTO dto = convertToDTO(savedComplaint);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Complaint status updated successfully",
                    "complaint", dto,
                    "statusLogId", savedLog.getId(),
                    "updatedBy", user.getFullName(),
                    "userRole", user.getRole().name()
            ));
        } catch (Exception e) {
            log.error("❌ Error updating complaint status: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to update complaint status",
                    "message", e.getMessage()
            ));
        }
    }

    // Helper method to check if user can update complaint
    private boolean canUpdateComplaint(Complaint complaint, User user) {
        // Admin can update any complaint
        if (user.getRole() == User.Role.ADMIN) {
            return true;
        }

        // Senior employee can update if:
        // 1. Complaint is escalated to them, OR
        // 2. They are assigned to the complaint
        if (user.getRole() == User.Role.SENIOR_EMPLOYEE) {
            if (complaint.getEscalatedTo() != null &&
                    complaint.getEscalatedTo().getId().equals(user.getId())) {
                return true;
            }
            if (complaint.getAssignedEmployee() != null &&
                    complaint.getAssignedEmployee().getId().equals(user.getId())) {
                return true;
            }
        }

        // Regular employee can update if assigned to them
        if (user.getRole() == User.Role.EMPLOYEE) {
            return complaint.getAssignedEmployee() != null &&
                    complaint.getAssignedEmployee().getId().equals(user.getId());
        }

        // Regular user can update only their own non-anonymous complaints
        if (user.getRole() == User.Role.USER) {
            return complaint.getUser() != null &&
                    !complaint.getAnonymous() &&
                    complaint.getUser().getId().equals(user.getId());
        }

        return false;
    }

    // Get escalated complaints for current user
    @GetMapping("/escalated/my")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMyEscalatedComplaints(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(401).body(Map.of("error", "No token provided"));
            }

            String token = authHeader.substring(7);
            String email = jwtService.extractUsername(token);

            if (email == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
            }

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Check if user is employee or senior employee
            if (user.getRole() != User.Role.EMPLOYEE &&
                    user.getRole() != User.Role.SENIOR_EMPLOYEE &&
                    user.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", "Access denied",
                        "message", "Only employees can view escalated complaints"
                ));
            }

            List<Complaint> escalatedComplaints = escalationService.getEscalatedComplaints(user);

            List<ComplaintResponseDTO> dtos = escalatedComplaints.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", dtos,
                    "count", dtos.size(),
                    "userRole", user.getRole().name()
            ));
        } catch (Exception e) {
            log.error("Failed to fetch escalated complaints: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to fetch escalated complaints: " + e.getMessage()
            ));
        }
    }

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

        // For anonymous complaints, do not expose any user info
        if (complaint.getUser() != null && !complaint.getAnonymous()) {
            dto.setUserId(complaint.getUser().getId());
            dto.setUserFullName(complaint.getUser().getFullName());
            dto.setUserEmail(complaint.getUser().getEmail());
        } else {
            // For anonymous complaints or when user is null
            dto.setUserId(null);
            dto.setUserFullName(null);
            dto.setUserEmail(null);
        }

        if (complaint.getAssignedEmployee() != null) {
            dto.setAssignedEmployeeId(complaint.getAssignedEmployee().getId());
            dto.setAssignedEmployeeName(complaint.getAssignedEmployee().getFullName());
        }

        if (complaint.getEscalatedTo() != null) {
            dto.setEscalatedToId(complaint.getEscalatedTo().getId());
            dto.setEscalatedToName(complaint.getEscalatedTo().getFullName());
            dto.setEscalationDate(complaint.getEscalationDate());
            dto.setEscalationReason(complaint.getEscalationReason());
        }

        if (complaint.getId() != null) {
            try {
                dto.setAttachmentCount(attachmentRepository.countByComplaintId(complaint.getId()));
                dto.setCommentCount(commentRepository.countByComplaintId(complaint.getId()));
                dto.setLikeCount(likeRepository.countByComplaintId(complaint.getId()));
            } catch (Exception e) {
                log.error("Error getting counts for complaint: {}", complaint.getId(), e);
                dto.setAttachmentCount(0L);
                dto.setCommentCount(0L);
                dto.setLikeCount(0L);
            }
        } else {
            dto.setAttachmentCount(0L);
            dto.setCommentCount(0L);
            dto.setLikeCount(0L);
        }

        // Add days calculation
        if (complaint.getCreatedAt() != null) {
            dto.setDaysSinceCreation((int) java.time.temporal.ChronoUnit.DAYS.between(
                    complaint.getCreatedAt(), LocalDateTime.now()
            ));
        }

        return dto;
    }
}