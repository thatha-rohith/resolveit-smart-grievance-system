package com.resolveit.dto;

import com.resolveit.model.EmployeeRequest;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class EmployeeRequestResponse {
    private Long id;
    private Long userId;
    private String userFullName;
    private String userEmail;
    private String reason;
    private EmployeeRequest.Status status;
    private String adminNotes;
    private LocalDateTime requestedAt;
    private LocalDateTime reviewedAt;
    private Long reviewedByAdminId;

    public EmployeeRequestResponse(EmployeeRequest request) {
        this.id = request.getId();

        if (request.getUser() != null) {
            this.userId = request.getUser().getId();
            this.userFullName = request.getUser().getFullName();
            this.userEmail = request.getUser().getEmail();
        }

        this.reason = request.getReason();
        this.status = request.getStatus();
        this.adminNotes = request.getAdminNotes();
        this.requestedAt = request.getRequestedAt();
        this.reviewedAt = request.getReviewedAt();
        this.reviewedByAdminId = request.getReviewedByAdminId();
    }
}