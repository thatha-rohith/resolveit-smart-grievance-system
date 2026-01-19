package com.resolveit.dto;
import com.resolveit.model.EmployeeSeniorRequest;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
public class SeniorRequestDTO {
    private Long id;
    private Long employeeId;
    private String employeeName;
    private String employeeEmail;
    private String reason;
    private String qualifications;
    private String experience;
    private String additionalInfo;
    private EmployeeSeniorRequest.Status status;
    private String adminNotes;
    private LocalDateTime requestedAt;
    private LocalDateTime reviewedAt;
    private Double resolutionRate;
    private Integer totalComplaints;
    private Integer resolvedComplaints;

    public SeniorRequestDTO(EmployeeSeniorRequest request) {
        this.id = request.getId();
        this.employeeId = request.getEmployee().getId();
        this.employeeName = request.getEmployee().getFullName();
        this.employeeEmail = request.getEmployee().getEmail();
        this.reason = request.getReason();
        this.qualifications = request.getQualifications();
        this.experience = request.getExperience();
        this.additionalInfo = request.getAdditionalInfo();
        this.status = request.getStatus();
        this.adminNotes = request.getAdminNotes();
        this.requestedAt = request.getRequestedAt();
        this.reviewedAt = request.getReviewedAt();
        this.resolutionRate = request.getResolutionRate();
        this.totalComplaints = request.getTotalComplaints();
        this.resolvedComplaints = request.getResolvedComplaints();
    }
}