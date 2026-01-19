package com.resolveit.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InternalNoteRequest {
    private String content;
    private Boolean isPrivate = true;
    private Long mentionedUserId;
}