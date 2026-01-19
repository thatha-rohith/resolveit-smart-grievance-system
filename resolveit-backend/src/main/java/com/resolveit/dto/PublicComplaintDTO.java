package com.resolveit.dto;

import com.resolveit.model.ComplaintState;
import com.resolveit.model.Urgency;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class PublicComplaintDTO {
    private Long id;
    private String title;
    private String category;
    private String description;
    private ComplaintState status;
    private Urgency urgency;
    private Boolean anonymous;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String userFullName;

    public PublicComplaintDTO(com.resolveit.model.Complaint complaint) {
        this.id = complaint.getId();
        this.title = complaint.getTitle();
        this.category = complaint.getCategory();
        this.description = complaint.getDescription();
        this.status = complaint.getStatus();
        this.urgency = complaint.getUrgency();
        this.anonymous = complaint.getAnonymous();
        this.createdAt = complaint.getCreatedAt();
        this.updatedAt = complaint.getUpdatedAt();

        if (!complaint.getAnonymous() && complaint.getUser() != null) {
            this.userFullName = complaint.getUser().getFullName();
        }
    }
}