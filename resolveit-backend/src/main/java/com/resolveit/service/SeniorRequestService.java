package com.resolveit.service;

import com.resolveit.model.Complaint;
import com.resolveit.model.User;
import com.resolveit.repository.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SeniorRequestService {

    private final ComplaintRepository complaintRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> checkEligibility(User employee) {
        Map<String, Object> result = new HashMap<>();

        // Get all complaints assigned to this employee
        List<Complaint> assignedComplaints = complaintRepository.findByAssignedEmployee(employee);

        int totalComplaints = assignedComplaints.size();
        int resolvedComplaints = (int) assignedComplaints.stream()
                .filter(c -> c.getStatus().name().equals("RESOLVED"))
                .count();

        double resolutionRate = totalComplaints > 0 ?
                (double) resolvedComplaints / totalComplaints * 100 : 0;

        result.put("totalComplaints", totalComplaints);
        result.put("resolvedComplaints", resolvedComplaints);
        result.put("resolutionRate", Math.round(resolutionRate * 100.0) / 100.0);

        // Check eligibility criteria
        boolean hasEnoughComplaints = totalComplaints >= 4;
        boolean hasGoodResolutionRate = resolutionRate >= 80.0;
        boolean isEligible = hasEnoughComplaints && hasGoodResolutionRate;

        result.put("eligible", isEligible);
        result.put("hasEnoughComplaints", hasEnoughComplaints);
        result.put("hasGoodResolutionRate", hasGoodResolutionRate);
        result.put("minComplaintsRequired", 4);
        result.put("minResolutionRateRequired", 80.0);

        if (!isEligible) {
            StringBuilder message = new StringBuilder("Not eligible because: ");
            if (!hasEnoughComplaints) {
                message.append("Need at least 4 assigned complaints (you have ").append(totalComplaints).append("). ");
            }
            if (!hasGoodResolutionRate) {
                message.append("Need at least 80% resolution rate (you have ").append(String.format("%.1f", resolutionRate)).append("%).");
            }
            result.put("message", message.toString());
        } else {
            result.put("message", "Eligible for senior role");
        }

        return result;
    }
}