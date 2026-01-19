package com.resolveit.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "complaint_comments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "complaint_id")
    @JsonIgnore  // Add this to prevent serialization issues
    private Complaint complaint;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 1000)
    private String comment;

    private LocalDateTime createdAt = LocalDateTime.now();
}