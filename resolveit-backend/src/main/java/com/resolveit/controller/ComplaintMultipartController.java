package com.resolveit.controller;

import com.resolveit.model.*;
import com.resolveit.repository.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/complaints")
public class ComplaintMultipartController {

    private final ComplaintRepository complaintRepo;
    private final AttachmentRepository attachmentRepo;
    private final UserRepository userRepo;

    public ComplaintMultipartController(
            ComplaintRepository complaintRepo,
            AttachmentRepository attachmentRepo,
            UserRepository userRepo
    ) {
        this.complaintRepo = complaintRepo;
        this.attachmentRepo = attachmentRepo;
        this.userRepo = userRepo;
    }

    @PostMapping(
            value = "/submit-multipart",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public Complaint submitComplaintMultipart(
            @RequestParam String title,
            @RequestParam String category,
            @RequestParam String description,
            @RequestParam String urgency,
            @RequestParam(required = false, defaultValue = "false") Boolean anonymous,
            @RequestParam(required = false) MultipartFile[] files,
            Authentication authentication
    ) throws Exception {

        // Get current user
        User user = userRepo.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Complaint complaint = new Complaint();
        complaint.setTitle(title);
        complaint.setCategory(category);
        complaint.setDescription(description);
        complaint.setUrgency(Urgency.valueOf(urgency.toUpperCase()));
        complaint.setAnonymous(anonymous);
        complaint.setIsPublic(!anonymous);
        complaint.setStatus(ComplaintState.NEW);
        complaint.setUser(user);
        complaint.setCreatedAt(LocalDateTime.now());
        complaint.setUpdatedAt(LocalDateTime.now());

        Complaint savedComplaint = complaintRepo.save(complaint);

        // Handle file uploads if present
        if (files != null && files.length > 0) {
            File uploadDir = new File("uploads");
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            for (MultipartFile file : files) {
                if (!file.isEmpty()) {
                    String filename = System.currentTimeMillis() + "_" + file.getOriginalFilename();
                    File dest = new File(uploadDir, filename);

                    Files.copy(file.getInputStream(), dest.toPath());

                    Attachment attachment = new Attachment();
                    attachment.setFilename(file.getOriginalFilename());
                    attachment.setFilePath(dest.getAbsolutePath());
                    attachment.setComplaint(savedComplaint);
                    attachment.setUploadedAt(LocalDateTime.now());

                    attachmentRepo.save(attachment);
                }
            }
        }

        return savedComplaint;
    }
}