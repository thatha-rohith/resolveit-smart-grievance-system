package com.resolveit.service;

import com.resolveit.exception.ResourceNotFoundException;
import com.resolveit.exception.UnauthorizedException;
import com.resolveit.model.Complaint;
import com.resolveit.model.StatusLog;
import com.resolveit.model.User;
import com.resolveit.repository.ComplaintRepository;
import com.resolveit.repository.StatusLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StatusLogService {

    private final StatusLogRepository statusLogRepository;
    private final ComplaintRepository complaintRepository;

    @Transactional
    public StatusLog createStatusLog(Long complaintId, String comment, Boolean internalNote, User updatedBy) {
        try {
            Complaint complaint = complaintRepository.findById(complaintId)
                    .orElseThrow(() -> new ResourceNotFoundException("Complaint not found"));

            StatusLog statusLog = new StatusLog();
            statusLog.setStatus(complaint.getStatus());
            statusLog.setComment(comment);
            statusLog.setInternalNote(internalNote != null ? internalNote : false);
            statusLog.setComplaint(complaint);
            statusLog.setUpdatedBy(updatedBy);
            statusLog.setUpdatedAt(LocalDateTime.now());

            return statusLogRepository.save(statusLog);
        } catch (Exception e) {
            log.error("Error creating status log: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create status log: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<StatusLog> getStatusLogs(Long complaintId, User user) {
        try {
            Complaint complaint = complaintRepository.findById(complaintId)
                    .orElseThrow(() -> new ResourceNotFoundException("Complaint not found"));

            // Check if user can view logs
            if (!canViewStatusLogs(complaint, user)) {
                throw new UnauthorizedException("You are not authorized to view status logs");
            }

            if (user != null && user.getRole() == User.Role.ADMIN) {
                // Admin sees all logs
                return statusLogRepository.findByComplaintIdOrderByUpdatedAtAsc(complaintId);
            } else {
                // Others see only public logs
                return statusLogRepository.findPublicLogsByComplaintId(complaintId);
            }
        } catch (Exception e) {
            log.error("Error fetching status logs: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch status logs: " + e.getMessage());
        }
    }

    private boolean canViewStatusLogs(Complaint complaint, User user) {
        if (user == null) {
            return complaint.getIsPublic();
        }

        if (user.getRole() == User.Role.ADMIN) {
            return true;
        }

        if (user.getRole() == User.Role.EMPLOYEE) {
            return complaint.getAssignedEmployee() != null &&
                    complaint.getAssignedEmployee().getId().equals(user.getId());
        }

        return complaint.getUser() != null &&
                complaint.getUser().getId().equals(user.getId());
    }
}