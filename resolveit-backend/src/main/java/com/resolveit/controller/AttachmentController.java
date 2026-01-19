package com.resolveit.controller;

import com.resolveit.model.*;
import com.resolveit.repository.*;
import org.apache.commons.io.FilenameUtils;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/complaints/{complaintId}/attachments")
@CrossOrigin(origins = "http://localhost:3000", maxAge = 3600, allowCredentials = "true")
public class AttachmentController {

    private final ComplaintRepository complaintRepo;
    private final AttachmentRepository attachmentRepo;
    private final UserRepository userRepo;

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            "jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "txt"
    );
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final String UPLOAD_DIR = "uploads";

    public AttachmentController(
            ComplaintRepository complaintRepo,
            AttachmentRepository attachmentRepo,
            UserRepository userRepo
    ) {
        this.complaintRepo = complaintRepo;
        this.attachmentRepo = attachmentRepo;
        this.userRepo = userRepo;
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> upload(
            @PathVariable Long complaintId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        try {
            User user = userRepo.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Complaint complaint = complaintRepo.findById(complaintId)
                    .orElseThrow(() -> new RuntimeException("Complaint not found"));

            // Check permissions - Only user who submitted the complaint can upload
            // For anonymous complaints, no user is associated, so no one can upload after creation
            if (complaint.getAnonymous()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("error", "Cannot upload attachments to anonymous complaint after submission");
                return ResponseEntity.status(403).body(errorResponse);
            }

            // For non-anonymous complaints, check if this user submitted it
            if (complaint.getUser() == null || !complaint.getUser().getId().equals(user.getId())) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("error", "Not authorized to upload to this complaint");
                return ResponseEntity.status(403).body(errorResponse);
            }

            // Validate file
            if (file.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("error", "File is empty");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            if (file.getSize() > MAX_FILE_SIZE) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("error", "File size exceeds 10MB limit");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            String extension = FilenameUtils.getExtension(file.getOriginalFilename()).toLowerCase();
            if (!ALLOWED_EXTENSIONS.contains(extension)) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("error", "File type not allowed. Allowed: " + String.join(", ", ALLOWED_EXTENSIONS));
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Create upload directory if it doesn't exist
            File uploadDir = new File(UPLOAD_DIR);
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            // Generate unique filename
            String uniqueFilename = System.currentTimeMillis() + "_" +
                    UUID.randomUUID().toString().substring(0, 8) + "_" +
                    file.getOriginalFilename().replaceAll("[^a-zA-Z0-9.-]", "_");
            Path destPath = Paths.get(uploadDir.getAbsolutePath(), uniqueFilename);

            // Save file
            Files.copy(file.getInputStream(), destPath);

            // Save attachment record
            Attachment attachment = new Attachment();
            attachment.setFilename(file.getOriginalFilename());
            attachment.setFilePath(destPath.toAbsolutePath().toString());
            attachment.setComplaint(complaint);
            attachment.setUploadedAt(LocalDateTime.now());

            Attachment savedAttachment = attachmentRepo.save(attachment);

            // Update complaint attachment count
            long attachmentCount = attachmentRepo.countByComplaintId(complaintId);
            complaint.setAttachmentCount(attachmentCount);
            complaintRepo.save(complaint);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "File uploaded successfully");

            Map<String, Object> attachmentInfo = new HashMap<>();
            attachmentInfo.put("id", savedAttachment.getId());
            attachmentInfo.put("filename", savedAttachment.getFilename());
            attachmentInfo.put("uploadedAt", savedAttachment.getUploadedAt());

            response.put("attachment", attachmentInfo);

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to save file: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Upload failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> download(@PathVariable Long complaintId, @PathVariable Long id) {
        try {
            Attachment attachment = attachmentRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Attachment not found"));

            if (!attachment.getComplaint().getId().equals(complaintId)) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("error", "Attachment does not belong to this complaint");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            File file = new File(attachment.getFilePath());
            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }

            FileSystemResource resource = new FileSystemResource(file);

            // Determine content type
            String contentType = getContentType(attachment.getFilename());

            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + attachment.getFilename() + "\"");
            headers.add(HttpHeaders.CONTENT_TYPE, contentType);
            headers.add(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, HttpHeaders.CONTENT_DISPOSITION);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(resource);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Download failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @GetMapping
    public ResponseEntity<?> listAttachments(@PathVariable Long complaintId) {
        try {
            Complaint complaint = complaintRepo.findById(complaintId)
                    .orElseThrow(() -> new RuntimeException("Complaint not found"));

            List<Attachment> attachments = attachmentRepo.findAll().stream()
                    .filter(a -> a.getComplaint() != null &&
                            a.getComplaint().getId().equals(complaintId))
                    .toList();

            List<Map<String, Object>> response = new ArrayList<>();
            for (Attachment a : attachments) {
                Map<String, Object> attachmentMap = new HashMap<>();
                attachmentMap.put("id", a.getId());
                attachmentMap.put("filename", a.getFilename());
                attachmentMap.put("uploadedAt", a.getUploadedAt());
                attachmentMap.put("fileSize", getFileSize(a.getFilePath()));
                response.add(attachmentMap);
            }

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("attachments", response);
            result.put("count", response.size());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to list attachments");
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteAttachment(
            @PathVariable Long complaintId,
            @PathVariable Long id,
            Authentication authentication
    ) {
        try {
            User user = userRepo.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Attachment attachment = attachmentRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Attachment not found"));

            if (!attachment.getComplaint().getId().equals(complaintId)) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("error", "Attachment does not belong to this complaint");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Only admin can delete attachments
            if (user.getRole() != User.Role.ADMIN) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("error", "Only administrators can delete attachments");
                return ResponseEntity.status(403).body(errorResponse);
            }

            // Delete file from disk
            File file = new File(attachment.getFilePath());
            if (file.exists()) {
                file.delete();
            }

            // Delete database record
            attachmentRepo.delete(attachment);

            // Update complaint attachment count
            long attachmentCount = attachmentRepo.countByComplaintId(complaintId);
            attachment.getComplaint().setAttachmentCount(attachmentCount);
            complaintRepo.save(attachment.getComplaint());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Attachment deleted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Failed to delete attachment: " + e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    private String getFileSize(String filePath) {
        try {
            File file = new File(filePath);
            long size = file.length();

            if (size < 1024) {
                return size + " B";
            } else if (size < 1024 * 1024) {
                return String.format("%.1f KB", size / 1024.0);
            } else {
                return String.format("%.1f MB", size / (1024.0 * 1024.0));
            }
        } catch (Exception e) {
            return "Unknown";
        }
    }

    private String getContentType(String filename) {
        String extension = "";
        if (filename.contains(".")) {
            extension = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
        }

        switch (extension) {
            case "jpg":
            case "jpeg":
                return "image/jpeg";
            case "png":
                return "image/png";
            case "gif":
                return "image/gif";
            case "pdf":
                return "application/pdf";
            case "doc":
                return "application/msword";
            case "docx":
                return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "txt":
                return "text/plain";
            default:
                return "application/octet-stream";
        }
    }
}