package com.resolveit.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_senior_requests")
@Getter
@Setter
public class EmployeeSeniorRequest {

    public enum Status {
        PENDING,
        APPROVED,
        REJECTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private User employee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    @Column(length = 1000)
    private String reason;

    // ADD THESE 3 MISSING FIELDS:
    @Column(length = 1000)
    private String qualifications;

    @Column(length = 1000)
    private String experience;

    @Column(length = 1000)
    private String additionalInfo;

    @Column(length = 1000)
    private String adminNotes;

    private LocalDateTime requestedAt;
    private LocalDateTime reviewedAt;
    private Long reviewedByAdminId;

    @Column
    private Double resolutionRate;

    @Column
    private Integer totalComplaints;

    @Column
    private Integer resolvedComplaints;

    @PrePersist
    protected void onCreate() {
        if (requestedAt == null) {
            requestedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = Status.PENDING;
        }
    }
}