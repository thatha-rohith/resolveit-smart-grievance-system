package com.resolveit.dto;

import com.resolveit.model.ComplaintState;
import com.resolveit.model.Urgency;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ComplaintUpdateRequest {

    @Size(min = 3, max = 200, message = "Title must be between 3 and 200 characters")
    private String title;

    @Size(min = 2, max = 50, message = "Category must be between 2 and 50 characters")
    private String category;

    @Size(min = 10, max = 2000, message = "Description must be between 10 and 2000 characters")
    private String description;

    private ComplaintState status;

    private Urgency urgency;

    private Boolean anonymous;

    private Boolean isPublic;

    private Long assignedEmployeeId;
}