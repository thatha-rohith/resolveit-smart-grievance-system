package com.resolveit.service;

import com.resolveit.dto.EscalationRequest;
import com.resolveit.model.Complaint;
import com.resolveit.model.ComplaintState;
import com.resolveit.model.User;
import com.resolveit.repository.ComplaintRepository;
import com.resolveit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EscalationService {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;

    @Value("${escalation.threshold.minutes:7}")
    private int escalationThresholdMinutes;

    @Scheduled(cron = "${escalation.check.cron:0 */1 * * * ?}")
    @Transactional
    public void checkAndAutoEscalateComplaints() {
        log.info("🔄 Starting auto-escalation check... (Threshold: {} minutes)", escalationThresholdMinutes);

        try {
            LocalDateTime thresholdDate = LocalDateTime.now().minusMinutes(escalationThresholdMinutes);

            // Get complaints that need escalation
            List<Complaint> complaintsToEscalate = complaintRepository.findComplaintsForEscalation(thresholdDate);

            if (complaintsToEscalate.isEmpty()) {
                log.info("✅ No complaints need escalation");
                return;
            }

            log.info("📊 Found {} complaints requiring escalation", complaintsToEscalate.size());

            // Get all senior employees
            List<User> seniorEmployees = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == User.Role.SENIOR_EMPLOYEE)
                    .collect(Collectors.toList());

            if (seniorEmployees.isEmpty()) {
                log.warn("⚠️ No senior employees available for escalation");
                return;
            }

            log.info("👥 Available senior employees: {}", seniorEmployees.size());

            // Calculate current load for each senior employee
            Map<Long, Integer> seniorLoadMap = new HashMap<>();
            for (User senior : seniorEmployees) {
                // Get escalated complaints count
                Long escalatedCount = complaintRepository.countByEscalatedTo(senior);
                if (escalatedCount == null) escalatedCount = 0L;

                // Get assigned complaints (not escalated) count
                List<Complaint> assignedComplaints = complaintRepository.findByAssignedEmployee(senior);
                long unresolvedAssigned = assignedComplaints.stream()
                        .filter(c -> c.getStatus() != ComplaintState.RESOLVED && c.getEscalatedTo() == null)
                        .count();

                int totalLoad = (int) (escalatedCount + unresolvedAssigned);
                seniorLoadMap.put(senior.getId(), totalLoad);
                log.debug("Senior {}: {} escalated + {} assigned = {} total load",
                        senior.getEmail(), escalatedCount, unresolvedAssigned, totalLoad);
            }

            // Escalate each complaint to the senior with least load
            for (Complaint complaint : complaintsToEscalate) {
                try {
                    // Find senior with minimum load
                    Long bestSeniorId = seniorLoadMap.entrySet().stream()
                            .min(Map.Entry.comparingByValue())
                            .map(Map.Entry::getKey)
                            .orElse(null);

                    if (bestSeniorId == null) {
                        log.error("❌ No suitable senior found for complaint {}", complaint.getId());
                        continue;
                    }

                    User bestSenior = userRepository.findById(bestSeniorId)
                            .orElseThrow(() -> new RuntimeException("Senior employee not found"));

                    // Update complaint with escalation
                    complaint.setEscalatedTo(bestSenior);
                    complaint.setEscalationDate(LocalDateTime.now());
                    complaint.setEscalationReason("Auto-escalated: Unresolved for " +
                            escalationThresholdMinutes + " minutes. Assigned to senior with least workload.");
                    complaint.setUpdatedAt(LocalDateTime.now());

                    // If complaint was assigned to someone else, keep that info for tracking
                    if (complaint.getAssignedEmployee() == null) {
                        // If unassigned, assign to the senior
                        complaint.setAssignedEmployee(bestSenior);
                        complaint.setAssignedAt(LocalDateTime.now());
                    }

                    // Update status if it's NEW
                    if (complaint.getStatus() == ComplaintState.NEW) {
                        complaint.setStatus(ComplaintState.UNDER_REVIEW);
                    }

                    complaint.setRequiresEscalation(false); // Clear the flag since we're escalating it

                    Complaint savedComplaint = complaintRepository.save(complaint);

                    // Update the load map
                    seniorLoadMap.put(bestSeniorId, seniorLoadMap.get(bestSeniorId) + 1);

                    log.info("✅ Escalated complaint {} to senior {} (Email: {}) (New load: {})",
                            complaint.getId(), bestSenior.getFullName(), bestSenior.getEmail(),
                            seniorLoadMap.get(bestSeniorId));

                } catch (Exception e) {
                    log.error("❌ Error escalating complaint {}: {}", complaint.getId(), e.getMessage(), e);
                }
            }

            log.info("✅ Auto-escalation completed. {} complaints escalated.", complaintsToEscalate.size());

        } catch (Exception e) {
            log.error("❌ Error in auto-escalation check: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public Complaint escalateComplaint(Long complaintId, EscalationRequest request, User requestedBy) {
        log.info("📤 Manual escalation requested for complaint {} by {}", complaintId, requestedBy.getEmail());

        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        User seniorEmployee = userRepository.findById(request.getSeniorEmployeeId())
                .orElseThrow(() -> new RuntimeException("Senior employee not found"));

        if (seniorEmployee.getRole() != User.Role.SENIOR_EMPLOYEE &&
                seniorEmployee.getRole() != User.Role.ADMIN) {
            throw new RuntimeException("User is not a senior employee or admin");
        }

        // Update complaint with escalation details
        complaint.setEscalatedTo(seniorEmployee);
        complaint.setEscalationDate(LocalDateTime.now());
        complaint.setEscalationReason(request.getReason());
        complaint.setUpdatedAt(LocalDateTime.now());

        // If not already assigned, assign to the senior
        if (complaint.getAssignedEmployee() == null) {
            complaint.setAssignedEmployee(seniorEmployee);
            complaint.setAssignedAt(LocalDateTime.now());
        }

        if (complaint.getStatus() == ComplaintState.NEW) {
            complaint.setStatus(ComplaintState.UNDER_REVIEW);
        }

        complaint.setRequiresEscalation(false);

        Complaint savedComplaint = complaintRepository.save(complaint);

        log.info("✅ Complaint {} escalated to senior employee {} by {}",
                complaintId, seniorEmployee.getEmail(), requestedBy.getEmail());

        return savedComplaint;
    }

    @Transactional(readOnly = true)
    public List<Complaint> getEscalatedComplaints(User user) {
        log.info("Fetching escalated complaints for user: {}", user.getEmail());

        if (user.getRole() == User.Role.EMPLOYEE ||
                user.getRole() == User.Role.SENIOR_EMPLOYEE ||
                user.getRole() == User.Role.ADMIN) {
            // Return complaints escalated to this user
            List<Complaint> escalated = complaintRepository.findByEscalatedTo(user);
            log.info("Found {} complaints escalated to user {}", escalated.size(), user.getEmail());
            return escalated;
        }
        return Collections.emptyList();
    }

    @Transactional(readOnly = true)
    public List<Complaint> getAllEscalatedComplaints() {
        List<Complaint> allEscalated = complaintRepository.findAllEscalatedComplaints();
        log.info("Found total {} escalated complaints in system", allEscalated.size());
        return allEscalated;
    }

    @Transactional(readOnly = true)
    public List<Complaint> getComplaintsRequiringEscalation() {
        LocalDateTime thresholdDate = LocalDateTime.now().minusMinutes(escalationThresholdMinutes);
        List<Complaint> complaints = complaintRepository.findComplaintsForEscalation(thresholdDate);
        log.info("Found {} complaints requiring escalation (threshold: {} minutes)",
                complaints.size(), escalationThresholdMinutes);
        return complaints;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSeniorEmployeeLoad() {
        List<User> seniorEmployees = userRepository.findAll().stream()
                .filter(u -> u.getRole() == User.Role.SENIOR_EMPLOYEE)
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> loadData = new ArrayList<>();

        int totalEscalatedComplaints = 0;

        for (User se : seniorEmployees) {
            // Get escalated complaints
            List<Complaint> escalatedComplaints = complaintRepository.findByEscalatedTo(se);

            // Get assigned complaints (not escalated)
            List<Complaint> assignedComplaints = complaintRepository.findByAssignedEmployee(se);
            long unresolvedAssigned = assignedComplaints.stream()
                    .filter(c -> c.getStatus() != ComplaintState.RESOLVED && c.getEscalatedTo() == null)
                    .count();

            // Calculate resolution rate for escalated complaints
            long totalHandled = escalatedComplaints.size();
            long resolvedEscalated = escalatedComplaints.stream()
                    .filter(c -> c.getStatus() == ComplaintState.RESOLVED)
                    .count();

            double resolutionRate = totalHandled > 0 ?
                    ((double) resolvedEscalated / totalHandled) * 100 : 0.0;

            Map<String, Object> data = new HashMap<>();
            data.put("id", se.getId());
            data.put("name", se.getFullName());
            data.put("email", se.getEmail());
            data.put("escalatedCount", escalatedComplaints.size());
            data.put("assignedCount", unresolvedAssigned);
            data.put("totalLoad", escalatedComplaints.size() + unresolvedAssigned);
            data.put("resolutionRate", Math.round(resolutionRate * 100.0) / 100.0);
            data.put("totalHandled", totalHandled);
            data.put("resolvedCount", resolvedEscalated);

            loadData.add(data);
            totalEscalatedComplaints += escalatedComplaints.size();
        }

        // Sort by load (ascending - least loaded first)
        loadData.sort(Comparator.comparingInt(d -> (Integer) d.get("totalLoad")));

        result.put("seniorEmployees", loadData);
        result.put("totalSeniorEmployees", seniorEmployees.size());
        result.put("totalEscalatedComplaints", totalEscalatedComplaints);
        result.put("escalationThresholdMinutes", escalationThresholdMinutes);
        result.put("timestamp", LocalDateTime.now());

        return result;
    }

    @Transactional(readOnly = true)
    public List<Complaint> getEmployeeEscalatedComplaints(Long employeeId) {
        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        return complaintRepository.findByEscalatedTo(employee);
    }
}