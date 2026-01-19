package com.resolveit.dto;

import com.resolveit.model.User;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CommentDTO {
    private Long id;
    private String comment;
    private LocalDateTime createdAt;
    private Long userId;
    private String userFullName;
    private String userEmail;
    private String userRole;

    public CommentDTO(com.resolveit.model.ComplaintComment comment) {
        this.id = comment.getId();
        this.comment = comment.getComment();
        this.createdAt = comment.getCreatedAt();

        User user = comment.getUser();
        if (user != null) {
            this.userId = user.getId();
            this.userFullName = user.getFullName();
            this.userEmail = user.getEmail();
            this.userRole = user.getRole().name();
        }
    }
}