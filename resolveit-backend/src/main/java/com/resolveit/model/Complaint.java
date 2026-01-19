package com.resolveit.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Entity
@Table(name = "complaints")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false, length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComplaintState status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Urgency urgency;

    @Column(nullable = false)
    private Boolean anonymous = false;

    @Column(nullable = false)
    private Boolean isPublic = true;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_employee_id")
    private User assignedEmployee;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "escalated_to_id")
    private User escalatedTo;

    @Column
    private LocalDateTime escalationDate;

    @Column(length = 500)
    private String escalationReason;

    @Column
    private LocalDateTime lastStatusChangeDate;

    @Column
    private Boolean requiresEscalation = false;

    @Column
    private Integer daysOpen = 0;

    @Column
    private Integer daysSinceAssignment = 0;

    @Column
    private Long attachmentCount = 0L;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime assignedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        lastStatusChangeDate = LocalDateTime.now();
        if (anonymous == null) anonymous = false;
        isPublic = !anonymous;
        if (status == null) status = ComplaintState.NEW;
        if (attachmentCount == null) attachmentCount = 0L;
        calculateDays();
        checkEscalationRequirement();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        calculateDays();
        checkEscalationRequirement();

        if (status != null && (status == ComplaintState.UNDER_REVIEW || status == ComplaintState.RESOLVED)) {
            lastStatusChangeDate = LocalDateTime.now();
        }

        // Set assignedAt when employee is assigned
        if (assignedEmployee != null && assignedAt == null) {
            assignedAt = LocalDateTime.now();
        }
    }

    private void calculateDays() {
        if (createdAt != null) {
            daysOpen = (int) ChronoUnit.DAYS.between(createdAt, LocalDateTime.now());
        }

        if (assignedAt != null) {
            daysSinceAssignment = (int) ChronoUnit.DAYS.between(assignedAt, LocalDateTime.now());
        }
    }

    private void checkEscalationRequirement() {
        // Skip if already escalated or resolved
        if (escalatedTo != null || status == ComplaintState.RESOLVED) {
            requiresEscalation = false;
            return;
        }

        // Calculate threshold (7 days for production, minutes for testing)
        // For testing: 7 minutes, for production: 7 days = 10080 minutes
        int thresholdMinutes = 7; // For testing - change to 10080 for 7 days

        LocalDateTime thresholdDate = LocalDateTime.now().minusMinutes(thresholdMinutes);

        // Check if complaint needs escalation
        boolean needsEscalation = false;

        // Unassigned complaints older than threshold
        if (assignedEmployee == null && createdAt.isBefore(thresholdDate)) {
            needsEscalation = true;
            logEscalationReason("Unassigned for " + thresholdMinutes + " minutes");
        }
        // Assigned but not resolved for longer than threshold
        else if (assignedEmployee != null && status != ComplaintState.RESOLVED) {
            // Check if no status change for threshold time
            if (lastStatusChangeDate != null && lastStatusChangeDate.isBefore(thresholdDate)) {
                needsEscalation = true;
                logEscalationReason("No status change for " + thresholdMinutes + " minutes");
            }
            // Or if created before threshold (overall too old)
            else if (createdAt.isBefore(thresholdDate)) {
                needsEscalation = true;
                logEscalationReason("Created " + thresholdMinutes + " minutes ago with no resolution");
            }
        }

        requiresEscalation = needsEscalation;
    }

    private void logEscalationReason(String reason) {
        System.out.println("Complaint " + id + " requires escalation: " + reason);
    }

    // Helper method to get days since creation
    public Integer getDaysSinceCreation() {
        if (createdAt == null) return 0;
        return (int) ChronoUnit.DAYS.between(createdAt, LocalDateTime.now());
    }
}