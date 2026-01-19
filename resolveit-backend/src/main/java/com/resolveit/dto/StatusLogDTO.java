package com.resolveit.dto;

import com.resolveit.model.ComplaintState;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class StatusLogDTO {
    private Long id;
    private ComplaintState status;
    private String comment;
    private Boolean internalNote;
    private LocalDateTime updatedAt;
    private String updatedByName;
    private String updatedByEmail;

    public StatusLogDTO(com.resolveit.model.StatusLog log) {
        this.id = log.getId();
        this.status = log.getStatus();
        this.comment = log.getComment();
        this.internalNote = log.getInternalNote();
        this.updatedAt = log.getUpdatedAt();

        if (log.getUpdatedBy() != null) {
            this.updatedByName = log.getUpdatedBy().getFullName();
            this.updatedByEmail = log.getUpdatedBy().getEmail();
        }
    }
}