package com.resolveit.controller;

import com.resolveit.model.User;
import com.resolveit.repository.UserRepository;
import com.resolveit.service.ExportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {

    private final ExportService exportService;
    private final UserRepository userRepository;

    @GetMapping("/complaints/{format}")
    public ResponseEntity<?> exportComplaints(
            @PathVariable String format,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String urgency,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            Authentication authentication) {

        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Map<String, String> filters = new HashMap<>();
            if (status != null) filters.put("status", status);
            if (category != null) filters.put("category", category);
            if (urgency != null) filters.put("urgency", urgency);
            if (startDate != null) filters.put("startDate", startDate);
            if (endDate != null) filters.put("endDate", endDate);

            byte[] exportData = exportService.exportComplaints(user, format.toUpperCase(), filters);

            String filename = String.format("complaints_%s_%s.%s",
                    user.getEmail().replace("@", "_"),
                    System.currentTimeMillis(),
                    getFileExtension(format));

            String contentType = getContentType(format);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(exportData);

        } catch (Exception e) {
            log.error("❌ Error exporting complaints: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to export: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/performance/{format}")
    public ResponseEntity<?> exportPerformance(
            @PathVariable String format,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            Authentication authentication) {

        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Check if user is employee or senior employee
            if (user.getRole() != User.Role.EMPLOYEE &&
                    user.getRole() != User.Role.SENIOR_EMPLOYEE) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Only employees can export performance reports"
                ));
            }

            Map<String, String> filters = new HashMap<>();
            if (startDate != null) filters.put("startDate", startDate);
            if (endDate != null) filters.put("endDate", endDate);

            byte[] exportData = exportService.exportPerformanceReport(user, format.toUpperCase(), filters);

            String filename = String.format("performance_%s_%s.%s",
                    user.getEmail().replace("@", "_"),
                    System.currentTimeMillis(),
                    getFileExtension(format));

            String contentType = getContentType(format);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(exportData);

        } catch (Exception e) {
            log.error("❌ Error exporting performance: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to export: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/dashboard/{format}")
    public ResponseEntity<?> exportDashboard(
            @PathVariable String format,
            Authentication authentication) {

        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            byte[] exportData = exportService.exportDashboardData(user, format.toUpperCase());

            String rolePrefix = user.getRole().name().toLowerCase();
            String filename = String.format("%s_dashboard_%s_%s.%s",
                    rolePrefix,
                    user.getEmail().replace("@", "_"),
                    System.currentTimeMillis(),
                    getFileExtension(format));

            String contentType = getContentType(format);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(exportData);

        } catch (Exception e) {
            log.error("❌ Error exporting dashboard: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to export: " + e.getMessage()
            ));
        }
    }

    private String getContentType(String format) {
        switch (format.toUpperCase()) {
            case "CSV": return "text/csv";
            case "PDF": return "application/pdf";
            case "EXCEL": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            default: return "application/octet-stream";
        }
    }

    private String getFileExtension(String format) {
        switch (format.toUpperCase()) {
            case "CSV": return "csv";
            case "PDF": return "pdf";
            case "EXCEL": return "xlsx";
            default: return "bin";
        }
    }
}