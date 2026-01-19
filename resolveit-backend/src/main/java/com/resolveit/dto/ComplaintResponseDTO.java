package com.resolveit.dto;

import com.resolveit.model.ComplaintState;
import com.resolveit.model.Urgency;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ComplaintResponseDTO {
    private Long id;
    private String title;
    private String category;
    private String description;
    private ComplaintState status;
    private Urgency urgency;
    private Boolean anonymous;
    private Boolean isPublic;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // User info
    private Long userId;
    private String userFullName;
    private String userEmail;

    // Employee info
    private Long assignedEmployeeId;
    private String assignedEmployeeName;

    // Escalation info
    private Long escalatedToId;
    private String escalatedToName;
    private LocalDateTime escalationDate;
    private String escalationReason;

    // Counts
    private Long attachmentCount;
    private Long commentCount;
    private Long likeCount;

    // Additional fields
    private Integer daysSinceCreation;
    private Boolean requiresEscalation;

    public ComplaintResponseDTO() {
        this.attachmentCount = 0L;
        this.commentCount = 0L;
        this.likeCount = 0L;
        this.daysSinceCreation = 0;
        this.requiresEscalation = false;
    }
}