package com.resolveit.dto;

import com.resolveit.model.ComplaintState;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminStatusUpdateRequest {
    private ComplaintState status;
    private String comment;
    private Boolean internalNote;
    private Long assignEmployeeId;
}