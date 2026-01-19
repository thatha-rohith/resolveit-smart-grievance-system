package com.resolveit.controller;

import com.resolveit.dto.StatusLogDTO;
import com.resolveit.repository.StatusLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/complaints")
@RequiredArgsConstructor
public class ComplaintTimelineController {

    private final StatusLogRepository repo;

    @GetMapping("/{id}/timeline")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public List<StatusLogDTO> timeline(@PathVariable Long id) {
        return repo.findByComplaintIdOrderByUpdatedAtAsc(id)
                .stream()
                .filter(log -> !log.getInternalNote())
                .map(StatusLogDTO::new)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}/timeline/admin")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<StatusLogDTO> adminTimeline(@PathVariable Long id) {
        return repo.findByComplaintIdOrderByUpdatedAtAsc(id)
                .stream()
                .map(StatusLogDTO::new)
                .collect(Collectors.toList());
    }
}