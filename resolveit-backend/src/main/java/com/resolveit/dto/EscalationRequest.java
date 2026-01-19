package com.resolveit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EscalationRequest {
    @NotNull(message = "Senior employee ID is required")
    private Long seniorEmployeeId;

    @NotBlank(message = "Escalation reason is required")
    private String reason;
}