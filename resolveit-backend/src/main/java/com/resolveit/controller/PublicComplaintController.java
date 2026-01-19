package com.resolveit.controller;

import com.resolveit.dto.ComplaintResponseDTO;
import com.resolveit.model.Complaint;
import com.resolveit.repository.ComplaintRepository;
import com.resolveit.repository.ComplaintLikeRepository;
import com.resolveit.repository.AttachmentRepository;
import com.resolveit.repository.ComplaintCommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/public/complaints")
@RequiredArgsConstructor
@Transactional
public class PublicComplaintController {

    private final ComplaintRepository complaintRepository;
    private final ComplaintLikeRepository likeRepository;
    private final AttachmentRepository attachmentRepository;
    private final ComplaintCommentRepository commentRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getPublicComplaints() {
        try {
            List<Complaint> complaints = complaintRepository.findByIsPublicTrueOrderByCreatedAtDesc();
            List<ComplaintResponseDTO> dtos = complaints.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch complaints");
            errorResponse.put("message", e.getMessage());
            errorResponse.put("timestamp", new Date());
            return ResponseEntity.internalServerError().body(errorResponse);
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

        if (!complaint.getAnonymous() && complaint.getUser() != null) {
            dto.setUserId(complaint.getUser().getId());
            dto.setUserFullName(complaint.getUser().getFullName());
            dto.setUserEmail(complaint.getUser().getEmail());
        }

        if (complaint.getId() != null) {
            try {
                dto.setAttachmentCount(attachmentRepository.countByComplaintId(complaint.getId()));
                dto.setCommentCount(commentRepository.countByComplaintId(complaint.getId()));
                dto.setLikeCount(likeRepository.countByComplaintId(complaint.getId()));
            } catch (Exception e) {
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