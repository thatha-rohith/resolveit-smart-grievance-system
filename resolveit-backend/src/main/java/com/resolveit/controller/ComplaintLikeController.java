package com.resolveit.controller;

import com.resolveit.model.*;
import com.resolveit.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/complaints/{complaintId}/like")
@RequiredArgsConstructor
public class ComplaintLikeController {

    private final ComplaintRepository complaintRepo;
    private final ComplaintLikeRepository likeRepo;
    private final UserRepository userRepo;

    @PostMapping
    @Transactional
    public ResponseEntity<?> likeOrUnlike(
            @PathVariable Long complaintId,
            Authentication auth
    ) {
        try {
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of(
                        "error", "Authentication required",
                        "message", "Please login to like complaints"
                ));
            }

            User user = userRepo.findByEmail(auth.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Complaint complaint = complaintRepo.findById(complaintId)
                    .orElseThrow(() -> new RuntimeException("Complaint not found"));

            // Check if complaint is public (only public complaints can be liked)
            if (!complaint.getIsPublic()) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", "Cannot like private complaint",
                        "message", "Only public complaints can be liked"
                ));
            }

            Optional<ComplaintLike> existingLike = likeRepo.findByComplaintIdAndUserId(complaintId, user.getId());

            Map<String, Object> response = new HashMap<>();

            if (existingLike.isPresent()) {
                likeRepo.delete(existingLike.get());
                response.put("action", "UNLIKED");
                response.put("liked", false);
                response.put("message", "Complaint unliked");
            } else {
                ComplaintLike like = new ComplaintLike();
                like.setComplaint(complaint);
                like.setUser(user);
                likeRepo.save(like);
                response.put("action", "LIKED");
                response.put("liked", true);
                response.put("message", "Complaint liked");
            }

            long likeCount = likeRepo.countByComplaintId(complaintId);
            response.put("likeCount", likeCount);
            response.put("success", true);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error in like/unlike: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Failed to process like",
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/count")
    public ResponseEntity<?> likeCount(@PathVariable Long complaintId) {
        try {
            long count = likeRepo.countByComplaintId(complaintId);
            return ResponseEntity.ok(Map.of(
                    "likeCount", count,
                    "success", true
            ));
        } catch (Exception e) {
            log.error("Error getting like count: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Failed to get like count",
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/status")
    public ResponseEntity<?> getLikeStatus(
            @PathVariable Long complaintId,
            Authentication auth
    ) {
        try {
            long likeCount = likeRepo.countByComplaintId(complaintId);

            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.ok(Map.of(
                        "hasLiked", false,
                        "likeCount", likeCount,
                        "success", true
                ));
            }

            String email = auth.getName();
            User user = userRepo.findByEmail(email)
                    .orElse(null);

            if (user == null) {
                return ResponseEntity.ok(Map.of(
                        "hasLiked", false,
                        "likeCount", likeCount,
                        "success", true
                ));
            }

            Optional<ComplaintLike> existingLike = likeRepo.findByComplaintIdAndUserId(complaintId, user.getId());
            boolean hasLiked = existingLike.isPresent();

            return ResponseEntity.ok(Map.of(
                    "hasLiked", hasLiked,
                    "likeCount", likeCount,
                    "success", true
            ));

        } catch (Exception e) {
            log.error("Error getting like status: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                    "hasLiked", false,
                    "likeCount", 0,
                    "success", false
            ));
        }
    }
}