package com.resolveit.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
public class DashboardStatsDTO {
    private Long totalComplaints;
    private Long newComplaints;
    private Long inProgressComplaints;
    private Long resolvedComplaints;
    private Long pendingEscalations;
    private Long assignedToMe;
    private Long escalatedToMe;

    private Map<String, Long> complaintsByCategory;
    private Map<String, Long> complaintsByStatus;
    private Map<String, Long> complaintsByUrgency;
    private Map<String, Long> complaintsByDay;
    private Map<String, Long> complaintsByMonth;

    private Double averageResolutionTime;
    private Long complaintsPastDue;
    private List<ComplaintResponseDTO> recentComplaints;
    private List<Map<String, Object>> escalationTrends;
}