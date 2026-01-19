package com.resolveit.service;

import com.resolveit.dto.DashboardStatsDTO;
import com.resolveit.dto.ComplaintResponseDTO;
import com.resolveit.model.Complaint;
import com.resolveit.model.User;
import com.resolveit.repository.ComplaintRepository;
import com.resolveit.repository.InternalNoteRepository;
import com.resolveit.repository.StatusLogRepository;
import com.resolveit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final ComplaintRepository complaintRepository;
    private final StatusLogRepository statusLogRepository;
    private final InternalNoteRepository internalNoteRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public DashboardStatsDTO getAdminDashboardStats() {
        log.info("📊 Generating admin dashboard stats");

        DashboardStatsDTO stats = new DashboardStatsDTO();

        List<Complaint> allComplaints = complaintRepository.findAll();

        // Basic counts
        stats.setTotalComplaints((long) allComplaints.size());
        stats.setNewComplaints(countByStatus(allComplaints, "NEW"));
        stats.setInProgressComplaints(countByStatus(allComplaints, "UNDER_REVIEW"));
        stats.setResolvedComplaints(countByStatus(allComplaints, "RESOLVED"));
        stats.setPendingEscalations(countEscalatedComplaints(allComplaints));

        // Admin-specific stats
        stats.setAssignedToMe(0L); // Admin doesn't have personal assignments
        stats.setEscalatedToMe(0L); // Admin doesn't have personal escalations

        // Enhanced charts data
        stats.setComplaintsByCategory(getComplaintsByCategory(allComplaints));
        stats.setComplaintsByStatus(getComplaintsByStatus(allComplaints));
        stats.setComplaintsByUrgency(getComplaintsByUrgency(allComplaints));
        stats.setComplaintsByDay(getDailyComplaintsTrend(30));
        stats.setComplaintsByMonth(getMonthlyComplaintsTrend(12));

        // System-wide performance metrics
        stats.setAverageResolutionTime(calculateAverageResolutionTime(allComplaints));
        stats.setComplaintsPastDue(countPastDueComplaints(allComplaints, 7));

        // Recent complaints (all system)
        stats.setRecentComplaints(getRecentComplaints(10));

        return stats;
    }

    @Transactional(readOnly = true)
    public DashboardStatsDTO getEmployeeDashboardStats(User employee) {
        log.info("📊 Generating enhanced employee dashboard stats for {}", employee.getEmail());

        DashboardStatsDTO stats = new DashboardStatsDTO();

        List<Complaint> assignedComplaints = complaintRepository.findByAssignedEmployee(employee);
        List<Complaint> escalatedComplaints = complaintRepository.findByEscalatedTo(employee);

        List<Complaint> allRelevantComplaints = new ArrayList<>();
        allRelevantComplaints.addAll(assignedComplaints);
        allRelevantComplaints.addAll(escalatedComplaints);

        // Basic counts
        stats.setTotalComplaints((long) allRelevantComplaints.size());
        stats.setAssignedToMe((long) assignedComplaints.size());
        stats.setEscalatedToMe((long) escalatedComplaints.size());
        stats.setNewComplaints(countByStatus(allRelevantComplaints, "NEW"));
        stats.setInProgressComplaints(countByStatus(allRelevantComplaints, "UNDER_REVIEW"));
        stats.setResolvedComplaints(countByStatus(allRelevantComplaints, "RESOLVED"));
        stats.setPendingEscalations(countEscalatedComplaints(allRelevantComplaints));

        // Enhanced charts data with more granular data
        stats.setComplaintsByCategory(getComplaintsByCategory(allRelevantComplaints));
        stats.setComplaintsByStatus(getComplaintsByStatus(allRelevantComplaints));
        stats.setComplaintsByUrgency(getComplaintsByUrgency(allRelevantComplaints));
        stats.setComplaintsByDay(getDailyComplaintsTrendForEmployee(employee, 30));
        stats.setComplaintsByMonth(getMonthlyComplaintsTrendForEmployee(employee, 12));

        // Performance metrics with more details
        stats.setAverageResolutionTime(calculateAverageResolutionTime(assignedComplaints));
        stats.setComplaintsPastDue(countPastDueComplaints(assignedComplaints, 7));

        // Recent complaints for employee
        stats.setRecentComplaints(getRecentComplaintsForEmployee(employee, 10));

        return stats;
    }

    @Transactional(readOnly = true)
    public DashboardStatsDTO getUserDashboardStats(User user) {
        log.info("📊 Generating user dashboard stats for {}", user.getEmail());

        DashboardStatsDTO stats = new DashboardStatsDTO();

        List<Complaint> userComplaints = complaintRepository.findByUser(user);

        // Basic counts for user's own complaints
        stats.setTotalComplaints((long) userComplaints.size());
        stats.setAssignedToMe(0L); // User doesn't have assignments
        stats.setEscalatedToMe(0L); // User doesn't have escalations
        stats.setNewComplaints(countByStatus(userComplaints, "NEW"));
        stats.setInProgressComplaints(countByStatus(userComplaints, "UNDER_REVIEW"));
        stats.setResolvedComplaints(countByStatus(userComplaints, "RESOLVED"));
        stats.setPendingEscalations(countEscalatedComplaints(userComplaints));

        // Charts data for user's complaints
        stats.setComplaintsByCategory(getComplaintsByCategory(userComplaints));
        stats.setComplaintsByStatus(getComplaintsByStatus(userComplaints));
        stats.setComplaintsByUrgency(getComplaintsByUrgency(userComplaints));
        stats.setComplaintsByDay(getDailyComplaintsTrendForUser(user, 30));
        stats.setComplaintsByMonth(getMonthlyComplaintsTrendForUser(user, 12));

        // User-specific metrics
        stats.setAverageResolutionTime(calculateAverageResolutionTime(userComplaints));
        stats.setComplaintsPastDue(countPastDueComplaints(userComplaints, 7));

        // Recent complaints for user
        stats.setRecentComplaints(getRecentComplaintsForUser(user, 10));

        return stats;
    }

    // Helper methods for admin dashboard
    private Map<String, Long> getDailyComplaintsTrend(int days) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM-dd");
        Map<String, Long> trend = new LinkedHashMap<>();

        LocalDateTime startDate = LocalDateTime.now().minusDays(days);

        // Use the repository's getDailyComplaints method
        List<Object[]> dailyData = complaintRepository.getDailyComplaints(startDate);

        // Convert the result to a map for easier lookup
        Map<String, Long> dailyCountMap = new HashMap<>();
        for (Object[] data : dailyData) {
            LocalDate date = ((java.sql.Date) data[0]).toLocalDate();
            Long count = (Long) data[1];
            String dateStr = date.format(formatter);
            dailyCountMap.put(dateStr, count);
        }

        // Fill in the trend for the last 'days' days
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            String dateStr = date.format(formatter);

            Long count = dailyCountMap.getOrDefault(dateStr, 0L);
            trend.put(dateStr, count);
        }

        return trend;
    }

    private Map<String, Long> getMonthlyComplaintsTrend(int months) {
        Map<String, Long> trend = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM");

        List<Complaint> allComplaints = complaintRepository.findAll();

        for (int i = months - 1; i >= 0; i--) {
            LocalDateTime date = LocalDateTime.now().minusMonths(i);
            String monthStr = date.format(formatter);

            int targetMonth = date.getMonthValue();
            int targetYear = date.getYear();

            long count = allComplaints.stream()
                    .filter(c -> {
                        LocalDateTime createdAt = c.getCreatedAt();
                        return createdAt != null &&
                                createdAt.getMonthValue() == targetMonth &&
                                createdAt.getYear() == targetYear;
                    })
                    .count();

            trend.put(monthStr, count);
        }

        return trend;
    }

    private List<ComplaintResponseDTO> getRecentComplaints(int limit) {
        return complaintRepository.findAll().stream()
                .sorted((c1, c2) -> c2.getCreatedAt().compareTo(c1.getCreatedAt()))
                .limit(limit)
                .map(this::convertToDTO)
                .toList();
    }

    // Helper methods for user dashboard
    private Map<String, Long> getDailyComplaintsTrendForUser(User user, int days) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM-dd");
        Map<String, Long> trend = new LinkedHashMap<>();

        List<Complaint> userComplaints = complaintRepository.findByUser(user);

        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            String dateStr = date.format(formatter);

            long count = userComplaints.stream()
                    .filter(c -> {
                        LocalDateTime createdAt = c.getCreatedAt();
                        return createdAt != null &&
                                createdAt.toLocalDate().equals(date);
                    })
                    .count();

            trend.put(dateStr, count);
        }

        return trend;
    }

    private Map<String, Long> getMonthlyComplaintsTrendForUser(User user, int months) {
        Map<String, Long> trend = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM");

        List<Complaint> userComplaints = complaintRepository.findByUser(user);

        for (int i = months - 1; i >= 0; i--) {
            LocalDateTime date = LocalDateTime.now().minusMonths(i);
            String monthStr = date.format(formatter);

            int targetMonth = date.getMonthValue();
            int targetYear = date.getYear();

            long count = userComplaints.stream()
                    .filter(c -> {
                        LocalDateTime createdAt = c.getCreatedAt();
                        return createdAt != null &&
                                createdAt.getMonthValue() == targetMonth &&
                                createdAt.getYear() == targetYear;
                    })
                    .count();

            trend.put(monthStr, count);
        }

        return trend;
    }

    private List<ComplaintResponseDTO> getRecentComplaintsForUser(User user, int limit) {
        return complaintRepository.findByUser(user).stream()
                .sorted((c1, c2) -> c2.getCreatedAt().compareTo(c1.getCreatedAt()))
                .limit(limit)
                .map(this::convertToDTO)
                .toList();
    }

    // Common helper methods
    private long countByStatus(List<Complaint> complaints, String status) {
        return complaints.stream()
                .filter(c -> c.getStatus().name().equals(status))
                .count();
    }

    private long countEscalatedComplaints(List<Complaint> complaints) {
        return complaints.stream()
                .filter(c -> c.getEscalatedTo() != null)
                .count();
    }

    private Map<String, Long> getComplaintsByCategory(List<Complaint> complaints) {
        return complaints.stream()
                .collect(Collectors.groupingBy(
                        Complaint::getCategory,
                        Collectors.counting()
                ));
    }

    private Map<String, Long> getComplaintsByStatus(List<Complaint> complaints) {
        return complaints.stream()
                .collect(Collectors.groupingBy(
                        c -> c.getStatus().name(),
                        Collectors.counting()
                ));
    }

    private Map<String, Long> getComplaintsByUrgency(List<Complaint> complaints) {
        return complaints.stream()
                .collect(Collectors.groupingBy(
                        c -> c.getUrgency().name(),
                        Collectors.counting()
                ));
    }

    private Double calculateAverageResolutionTime(List<Complaint> complaints) {
        List<Complaint> resolvedComplaints = complaints.stream()
                .filter(c -> c.getStatus().name().equals("RESOLVED") &&
                        c.getCreatedAt() != null && c.getUpdatedAt() != null)
                .toList();

        if (resolvedComplaints.isEmpty()) {
            return 0.0;
        }

        double totalHours = resolvedComplaints.stream()
                .mapToDouble(c -> java.time.Duration.between(
                        c.getCreatedAt(), c.getUpdatedAt()).toHours())
                .sum();

        return Math.round((totalHours / resolvedComplaints.size()) * 10.0) / 10.0;
    }

    private Long countPastDueComplaints(List<Complaint> complaints, int dueDays) {
        LocalDateTime dueDate = LocalDateTime.now().minusDays(dueDays);

        return complaints.stream()
                .filter(c -> c.getStatus().name().equals("UNDER_REVIEW") &&
                        c.getLastStatusChangeDate() != null &&
                        c.getLastStatusChangeDate().isBefore(dueDate))
                .count();
    }

    private List<ComplaintResponseDTO> getRecentComplaintsForEmployee(User employee, int limit) {
        List<Complaint> assignedComplaints = complaintRepository.findByAssignedEmployee(employee);
        List<Complaint> escalatedComplaints = complaintRepository.findByEscalatedTo(employee);
        List<Complaint> allComplaints = new ArrayList<>();
        allComplaints.addAll(assignedComplaints);
        allComplaints.addAll(escalatedComplaints);

        return allComplaints.stream()
                .sorted((c1, c2) -> c2.getCreatedAt().compareTo(c1.getCreatedAt()))
                .limit(limit)
                .map(this::convertToDTO)
                .toList();
    }

    private Map<String, Long> getDailyComplaintsTrendForEmployee(User employee, int days) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM-dd");

        Map<String, Long> trend = new LinkedHashMap<>();

        List<Complaint> assignedComplaints = complaintRepository.findByAssignedEmployee(employee);
        List<Complaint> escalatedComplaints = complaintRepository.findByEscalatedTo(employee);
        List<Complaint> allComplaints = new ArrayList<>();
        allComplaints.addAll(assignedComplaints);
        allComplaints.addAll(escalatedComplaints);

        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            String dateStr = date.format(formatter);

            long count = allComplaints.stream()
                    .filter(c -> {
                        LocalDateTime createdAt = c.getCreatedAt();
                        return createdAt != null &&
                                createdAt.toLocalDate().equals(date);
                    })
                    .count();

            trend.put(dateStr, count);
        }

        return trend;
    }

    private Map<String, Long> getMonthlyComplaintsTrendForEmployee(User employee, int months) {
        Map<String, Long> trend = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM");

        List<Complaint> assignedComplaints = complaintRepository.findByAssignedEmployee(employee);
        List<Complaint> escalatedComplaints = complaintRepository.findByEscalatedTo(employee);
        List<Complaint> allComplaints = new ArrayList<>();
        allComplaints.addAll(assignedComplaints);
        allComplaints.addAll(escalatedComplaints);

        for (int i = months - 1; i >= 0; i--) {
            LocalDateTime date = LocalDateTime.now().minusMonths(i);
            String monthStr = date.format(formatter);

            int targetMonth = date.getMonthValue();
            int targetYear = date.getYear();

            long count = allComplaints.stream()
                    .filter(c -> {
                        LocalDateTime createdAt = c.getCreatedAt();
                        return createdAt != null &&
                                createdAt.getMonthValue() == targetMonth &&
                                createdAt.getYear() == targetYear;
                    })
                    .count();

            trend.put(monthStr, count);
        }

        return trend;
    }

    private ComplaintResponseDTO convertToDTO(Complaint complaint) {
        ComplaintResponseDTO dto = new ComplaintResponseDTO();
        dto.setId(complaint.getId());
        dto.setTitle(complaint.getTitle());
        dto.setCategory(complaint.getCategory());
        dto.setDescription(complaint.getDescription());
        dto.setStatus(complaint.getStatus());
        dto.setUrgency(complaint.getUrgency());
        dto.setAnonymous(complaint.getAnonymous());
        dto.setIsPublic(complaint.getIsPublic());
        dto.setCreatedAt(complaint.getCreatedAt());
        dto.setUpdatedAt(complaint.getUpdatedAt());

        if (complaint.getUser() != null) {
            dto.setUserId(complaint.getUser().getId());
            dto.setUserFullName(complaint.getUser().getFullName());
            dto.setUserEmail(complaint.getUser().getEmail());
        }

        // Handle assigned vs escalated employee
        if (complaint.getEscalatedTo() != null) {
            // If escalated, show escalated employee
            dto.setAssignedEmployeeId(complaint.getEscalatedTo().getId());
            dto.setAssignedEmployeeName(complaint.getEscalatedTo().getFullName());
        } else if (complaint.getAssignedEmployee() != null) {
            // If not escalated, show assigned employee
            dto.setAssignedEmployeeId(complaint.getAssignedEmployee().getId());
            dto.setAssignedEmployeeName(complaint.getAssignedEmployee().getFullName());
        }
        // If neither, the fields remain null

        // Counts - these would be populated from other repositories in a real implementation
        dto.setAttachmentCount(0L);
        dto.setCommentCount(0L);
        dto.setLikeCount(0L);

        return dto;
    }

    // The following methods from the original file are no longer needed in the main flow
    // but kept for compatibility with other parts of the system if needed
    private double calculateResolutionRate(List<Complaint> complaints) {
        if (complaints.isEmpty()) return 0.0;
        long resolved = complaints.stream()
                .filter(c -> c.getStatus().name().equals("RESOLVED"))
                .count();
        return Math.round((double) resolved / complaints.size() * 10000) / 100.0;
    }

    private double calculateAverageResponseTime(List<Complaint> complaints) {
        List<Complaint> resolvedComplaints = complaints.stream()
                .filter(c -> c.getStatus().name().equals("RESOLVED"))
                .filter(c -> c.getCreatedAt() != null && c.getUpdatedAt() != null)
                .toList();

        if (resolvedComplaints.isEmpty()) return 0.0;

        double totalHours = resolvedComplaints.stream()
                .mapToDouble(c -> java.time.Duration.between(
                        c.getCreatedAt(), c.getUpdatedAt()).toHours())
                .sum();

        return Math.round(totalHours / resolvedComplaints.size() * 10.0) / 10.0;
    }

    private double calculateCustomerSatisfaction(List<Complaint> complaints) {
        double avgResolutionTime = calculateAverageResolutionTime(complaints);

        if (avgResolutionTime == 0) return 85.0;

        double satisfaction = 95.0 - (avgResolutionTime / 24.0);

        return Math.max(60.0, Math.min(100.0, satisfaction));
    }

    private Map<String, Object> checkSeniorEligibility(User employee) {
        Map<String, Object> eligibility = new HashMap<>();

        List<Complaint> assignedComplaints = complaintRepository.findByAssignedEmployee(employee);

        int totalComplaints = assignedComplaints.size();
        int resolvedComplaints = (int) assignedComplaints.stream()
                .filter(c -> c.getStatus().name().equals("RESOLVED"))
                .count();

        double resolutionRate = totalComplaints > 0 ?
                (double) resolvedComplaints / totalComplaints * 100 : 0;

        boolean hasEnoughComplaints = totalComplaints >= 4;
        boolean hasGoodResolutionRate = resolutionRate >= 80.0;
        boolean isEligible = hasEnoughComplaints && hasGoodResolutionRate;

        eligibility.put("eligible", isEligible);
        eligibility.put("totalComplaints", totalComplaints);
        eligibility.put("resolvedComplaints", resolvedComplaints);
        eligibility.put("resolutionRate", Math.round(resolutionRate * 100.0) / 100.0);
        eligibility.put("hasEnoughComplaints", hasEnoughComplaints);
        eligibility.put("hasGoodResolutionRate", hasGoodResolutionRate);
        eligibility.put("minComplaintsRequired", 4);
        eligibility.put("minResolutionRateRequired", 80.0);

        return eligibility;
    }
}