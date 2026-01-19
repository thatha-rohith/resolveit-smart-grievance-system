package com.resolveit.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "complaint_likes",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"complaint_id", "user_id"})
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "complaint_id", nullable = false)
    private Complaint complaint;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}