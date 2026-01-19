package com.resolveit.controller;

import com.resolveit.dto.AdminStatusUpdateRequest;
import com.resolveit.dto.ComplaintResponseDTO;
import com.resolveit.model.*;
import com.resolveit.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/complaints")
@RequiredArgsConstructor
@Transactional
public class AdminComplaintController {

    private final ComplaintRepository complaintRepo;
    private final StatusLogRepository logRepo;
    private final UserRepository userRepo;
    private final AttachmentRepository attachmentRepo;
    private final ComplaintCommentRepository commentRepo;
    private final ComplaintLikeRepository likeRepo;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<ComplaintResponseDTO>> getAllComplaints() {
        List<Complaint> complaints = complaintRepo.findAll();
        List<ComplaintResponseDTO> dtos = complaints.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<ComplaintResponseDTO> getComplaintById(@PathVariable Long id) {
        Complaint complaint = complaintRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        ComplaintResponseDTO dto = convertToDTO(complaint);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<ComplaintResponseDTO> updateComplaint(
            @PathVariable Long id,
            @RequestBody AdminStatusUpdateRequest request,
            Authentication authentication
    ) {
        User admin = userRepo.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        Complaint complaint = complaintRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        if (request.getStatus() != null) {
            complaint.setStatus(request.getStatus());
        }

        if (request.getAssignEmployeeId() != null) {
            User employee = userRepo.findById(request.getAssignEmployeeId())
                    .orElseThrow(() -> new RuntimeException("Employee not found"));

            if (employee.getRole() != User.Role.EMPLOYEE) {
                return ResponseEntity.badRequest()
                        .body(null);
            }

            complaint.setAssignedEmployee(employee);
        }

        complaint.setUpdatedAt(LocalDateTime.now());
        Complaint savedComplaint = complaintRepo.save(complaint);

        if (request.getStatus() != null) {
            StatusLog log = new StatusLog();
            log.setStatus(request.getStatus());
            log.setComment(request.getComment());
            log.setInternalNote(request.getInternalNote() != null ? request.getInternalNote() : false);
            log.setComplaint(savedComplaint);
            log.setUpdatedBy(admin);
            log.setUpdatedAt(LocalDateTime.now());
            logRepo.save(log);
        }

        ComplaintResponseDTO dto = convertToDTO(savedComplaint);
        return ResponseEntity.ok(dto);
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
            dto.setAttachmentCount(attachmentRepo.countByComplaintId(complaint.getId()));
            dto.setCommentCount(commentRepo.countByComplaintId(complaint.getId()));
            dto.setLikeCount(likeRepo.countByComplaintId(complaint.getId()));
        } else {
            dto.setAttachmentCount(0L);
            dto.setCommentCount(0L);
            dto.setLikeCount(0L);
        }

        return dto;
    }
}