package com.resolveit.controller;

import com.resolveit.dto.CommentRequest;
import com.resolveit.model.Complaint;
import com.resolveit.model.ComplaintComment;
import com.resolveit.model.User;
import com.resolveit.repository.ComplaintCommentRepository;
import com.resolveit.repository.ComplaintRepository;
import com.resolveit.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/complaints/{complaintId}/comments")
public class ComplaintCommentController {

    private final ComplaintRepository complaintRepo;
    private final ComplaintCommentRepository commentRepo;
    private final UserRepository userRepo;

    public ComplaintCommentController(
            ComplaintRepository complaintRepo,
            ComplaintCommentRepository commentRepo,
            UserRepository userRepo
    ) {
        this.complaintRepo = complaintRepo;
        this.commentRepo = commentRepo;
        this.userRepo = userRepo;
    }

    // =========================
    // GET COMMENTS (PUBLIC)
    // =========================
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<ComplaintComment>> getComments(
            @PathVariable Long complaintId
    ) {
        List<ComplaintComment> comments = commentRepo.findByComplaintIdOrderByCreatedAtAsc(complaintId);
        return ResponseEntity.ok(comments);
    }

    // =========================
    // ADD COMMENT (USER)
    // =========================
    @PostMapping
    @Transactional
    public ResponseEntity<?> addComment(
            @PathVariable Long complaintId,
            @RequestBody CommentRequest request,
            Authentication authentication
    ) {
        try {
            User user = userRepo
                    .findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Complaint complaint = complaintRepo
                    .findById(complaintId)
                    .orElseThrow(() -> new RuntimeException("Complaint not found"));

            ComplaintComment comment = new ComplaintComment();
            comment.setComplaint(complaint);
            comment.setUser(user);
            comment.setComment(request.getComment());
            comment.setCreatedAt(LocalDateTime.now());

            ComplaintComment savedComment = commentRepo.save(comment);
            return ResponseEntity.ok(savedComment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Failed to add comment",
                    "message", e.getMessage()
            ));
        }
    }
}