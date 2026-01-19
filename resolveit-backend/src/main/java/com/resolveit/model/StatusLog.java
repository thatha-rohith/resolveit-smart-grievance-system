package com.resolveit.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "status_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StatusLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComplaintState status;

    @Column(length = 1000)
    private String comment;

    @Column(nullable = false)
    private Boolean internalNote = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "complaint_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"}) // Add this
    private Complaint complaint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"}) // Add this
    private User updatedBy;

    private LocalDateTime updatedAt = LocalDateTime.now();
}