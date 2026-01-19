package com.resolveit.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.resolveit.model.Complaint;
import com.resolveit.model.User;
import com.resolveit.repository.ComplaintRepository;
import com.resolveit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.StringWriter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExportService {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final DashboardService dashboardService;

    @Transactional(readOnly = true)
    public byte[] exportComplaints(User user, String format, Map<String, String> filters) throws Exception {
        java.util.List<Complaint> complaints = getFilteredComplaints(user, filters);

        switch (format.toUpperCase()) {
            case "CSV":
                return generateComplaintsCSV(complaints, user, filters);
            case "PDF":
                return generateComplaintsPDF(complaints, user, filters);
            case "EXCEL":
                return generateComplaintsExcel(complaints, user, filters);
            default:
                throw new IllegalArgumentException("Unsupported format: " + format);
        }
    }

    @Transactional(readOnly = true)
    public byte[] exportPerformanceReport(User user, String format, Map<String, String> filters) throws Exception {
        Map<String, Object> performanceData = getPerformanceData(user, filters);

        switch (format.toUpperCase()) {
            case "CSV":
                return generatePerformanceCSV(performanceData, user);
            case "PDF":
                return generatePerformancePDF(performanceData, user, filters);
            case "EXCEL":
                return generatePerformanceExcel(performanceData, user);
            default:
                throw new IllegalArgumentException("Unsupported format: " + format);
        }
    }

    @Transactional(readOnly = true)
    public byte[] exportDashboardData(User user, String format) throws Exception {
        // Get dashboard stats based on user role
        Map<String, Object> dashboardData = new HashMap<>();

        if (user.getRole() == User.Role.ADMIN) {
            dashboardData.put("stats", dashboardService.getAdminDashboardStats());
            dashboardData.put("type", "ADMIN_DASHBOARD");
        } else if (user.getRole() == User.Role.EMPLOYEE || user.getRole() == User.Role.SENIOR_EMPLOYEE) {
            dashboardData.put("stats", dashboardService.getEmployeeDashboardStats(user));
            dashboardData.put("type", "EMPLOYEE_DASHBOARD");
        } else {
            dashboardData.put("stats", dashboardService.getUserDashboardStats(user));
            dashboardData.put("type", "USER_DASHBOARD");
        }

        switch (format.toUpperCase()) {
            case "CSV":
                return generateDashboardCSV(dashboardData, user);
            case "PDF":
                return generateDashboardPDF(dashboardData, user);
            case "EXCEL":
                return generateDashboardExcel(dashboardData, user);
            default:
                throw new IllegalArgumentException("Unsupported format: " + format);
        }
    }

    // ========== PRIVATE HELPER METHODS ==========

    private java.util.List<Complaint> getFilteredComplaints(User user, Map<String, String> filters) {
        java.util.List<Complaint> complaints;

        // Determine which complaints to show based on user role
        if (user.getRole() == User.Role.ADMIN) {
            // Admin sees all complaints
            complaints = complaintRepository.findAll();
        } else if (user.getRole() == User.Role.EMPLOYEE || user.getRole() == User.Role.SENIOR_EMPLOYEE) {
            // Employees see assigned and escalated complaints
            java.util.List<Complaint> assignedComplaints = complaintRepository.findByAssignedEmployee(user);
            java.util.List<Complaint> escalatedComplaints = complaintRepository.findByEscalatedTo(user);
            complaints = new ArrayList<>();
            complaints.addAll(assignedComplaints);
            complaints.addAll(escalatedComplaints);
        } else {
            // Regular users see only their own complaints
            complaints = complaintRepository.findByUser(user);
        }

        // Apply filters if provided
        if (filters == null || filters.isEmpty()) {
            return complaints;
        }

        return complaints.stream()
                .filter(complaint -> {
                    if (filters.containsKey("status") && filters.get("status") != null) {
                        String status = filters.get("status");
                        if (!complaint.getStatus().name().equals(status)) {
                            return false;
                        }
                    }

                    if (filters.containsKey("category") && filters.get("category") != null) {
                        String category = filters.get("category");
                        if (!complaint.getCategory().equalsIgnoreCase(category)) {
                            return false;
                        }
                    }

                    if (filters.containsKey("startDate") && filters.get("startDate") != null) {
                        LocalDateTime startDate = LocalDateTime.parse(filters.get("startDate") + "T00:00:00");
                        if (complaint.getCreatedAt().isBefore(startDate)) {
                            return false;
                        }
                    }

                    if (filters.containsKey("endDate") && filters.get("endDate") != null) {
                        LocalDateTime endDate = LocalDateTime.parse(filters.get("endDate") + "T23:59:59");
                        if (complaint.getCreatedAt().isAfter(endDate)) {
                            return false;
                        }
                    }

                    if (filters.containsKey("urgency") && filters.get("urgency") != null) {
                        String urgency = filters.get("urgency");
                        if (!complaint.getUrgency().name().equals(urgency)) {
                            return false;
                        }
                    }

                    return true;
                })
                .collect(Collectors.toList());
    }

    private Map<String, Object> getPerformanceData(User user, Map<String, String> filters) {
        Map<String, Object> data = new HashMap<>();

        java.util.List<Complaint> complaints = getFilteredComplaints(user, filters);

        // Basic stats
        data.put("totalComplaints", complaints.size());
        data.put("newComplaints", countByStatus(complaints, "NEW"));
        data.put("inProgressComplaints", countByStatus(complaints, "UNDER_REVIEW"));
        data.put("resolvedComplaints", countByStatus(complaints, "RESOLVED"));

        long escalated = complaints.stream()
                .filter(c -> c.getEscalatedTo() != null)
                .count();
        data.put("escalatedComplaints", escalated);

        double resolutionRate = complaints.isEmpty() ? 0 :
                (double) countByStatus(complaints, "RESOLVED") / complaints.size() * 100;
        data.put("resolutionRate", Math.round(resolutionRate * 100.0) / 100.0);

        // Time-based stats
        java.util.List<Complaint> resolvedComplaints = complaints.stream()
                .filter(c -> c.getStatus().name().equals("RESOLVED"))
                .filter(c -> c.getCreatedAt() != null && c.getUpdatedAt() != null)
                .collect(Collectors.toList());

        double avgResolutionTime = resolvedComplaints.isEmpty() ? 0 :
                resolvedComplaints.stream()
                        .mapToDouble(c -> java.time.Duration.between(
                                c.getCreatedAt(), c.getUpdatedAt()).toHours())
                        .average()
                        .orElse(0);
        data.put("averageResolutionTime", Math.round(avgResolutionTime * 10.0) / 10.0);

        // Category distribution
        Map<String, Long> categoryDistribution = complaints.stream()
                .collect(Collectors.groupingBy(Complaint::getCategory, Collectors.counting()));
        data.put("categoryDistribution", categoryDistribution);

        // Status distribution
        Map<String, Long> statusDistribution = complaints.stream()
                .collect(Collectors.groupingBy(c -> c.getStatus().name(), Collectors.counting()));
        data.put("statusDistribution", statusDistribution);

        // Urgency distribution
        Map<String, Long> urgencyDistribution = complaints.stream()
                .collect(Collectors.groupingBy(c -> c.getUrgency().name(), Collectors.counting()));
        data.put("urgencyDistribution", urgencyDistribution);

        return data;
    }

    private long countByStatus(java.util.List<Complaint> complaints, String status) {
        return complaints.stream()
                .filter(c -> c.getStatus().name().equals(status))
                .count();
    }

    // ========== CSV GENERATORS ==========

    private byte[] generateComplaintsCSV(java.util.List<Complaint> complaints, User user, Map<String, String> filters) throws IOException {
        StringWriter writer = new StringWriter();
        CSVPrinter csvPrinter = new CSVPrinter(writer, CSVFormat.DEFAULT
                .withHeader("ID", "Title", "Category", "Description", "Status",
                        "Urgency", "Anonymous", "Created At", "Updated At",
                        "User Name", "User Email", "Assigned Employee",
                        "Escalated To", "Escalation Reason"));

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        for (Complaint complaint : complaints) {
            csvPrinter.printRecord(
                    complaint.getId(),
                    complaint.getTitle(),
                    complaint.getCategory(),
                    complaint.getDescription(),
                    complaint.getStatus().name(),
                    complaint.getUrgency().name(),
                    complaint.getAnonymous() ? "Yes" : "No",
                    complaint.getCreatedAt().format(formatter),
                    complaint.getUpdatedAt().format(formatter),
                    complaint.getUser() != null ? complaint.getUser().getFullName() : "Anonymous",
                    complaint.getUser() != null ? complaint.getUser().getEmail() : "",
                    complaint.getAssignedEmployee() != null ?
                            complaint.getAssignedEmployee().getFullName() : "",
                    complaint.getEscalatedTo() != null ?
                            complaint.getEscalatedTo().getFullName() : "",
                    complaint.getEscalationReason() != null ?
                            complaint.getEscalationReason() : ""
            );
        }

        csvPrinter.flush();
        csvPrinter.close();

        return writer.toString().getBytes();
    }

    private byte[] generatePerformanceCSV(Map<String, Object> performanceData, User user) throws IOException {
        StringWriter writer = new StringWriter();
        CSVPrinter csvPrinter = new CSVPrinter(writer, CSVFormat.DEFAULT
                .withHeader("Metric", "Value"));

        csvPrinter.printRecord("Employee Name", user.getFullName());
        csvPrinter.printRecord("Employee Email", user.getEmail());
        csvPrinter.printRecord("Report Date", LocalDateTime.now().format(
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        csvPrinter.printRecord("", "");

        csvPrinter.printRecord("Total Complaints", performanceData.get("totalComplaints"));
        csvPrinter.printRecord("New Complaints", performanceData.get("newComplaints"));
        csvPrinter.printRecord("In Progress Complaints", performanceData.get("inProgressComplaints"));
        csvPrinter.printRecord("Resolved Complaints", performanceData.get("resolvedComplaints"));
        csvPrinter.printRecord("Escalated Complaints", performanceData.get("escalatedComplaints"));
        csvPrinter.printRecord("Resolution Rate (%)", performanceData.get("resolutionRate"));
        csvPrinter.printRecord("Average Resolution Time (hours)",
                performanceData.get("averageResolutionTime"));

        csvPrinter.printRecord("", "");
        csvPrinter.printRecord("Category Distribution", "");

        @SuppressWarnings("unchecked")
        Map<String, Long> categoryDist = (Map<String, Long>) performanceData.get("categoryDistribution");
        for (Map.Entry<String, Long> entry : categoryDist.entrySet()) {
            csvPrinter.printRecord(entry.getKey(), entry.getValue());
        }

        csvPrinter.printRecord("", "");
        csvPrinter.printRecord("Status Distribution", "");

        @SuppressWarnings("unchecked")
        Map<String, Long> statusDist = (Map<String, Long>) performanceData.get("statusDistribution");
        for (Map.Entry<String, Long> entry : statusDist.entrySet()) {
            csvPrinter.printRecord(entry.getKey(), entry.getValue());
        }

        csvPrinter.flush();
        csvPrinter.close();

        return writer.toString().getBytes();
    }

    private byte[] generateDashboardCSV(Map<String, Object> dashboardData, User user) throws IOException {
        StringWriter writer = new StringWriter();
        CSVPrinter csvPrinter = new CSVPrinter(writer, CSVFormat.DEFAULT
                .withHeader("Dashboard Metric", "Value"));

        Object stats = dashboardData.get("stats");
        String type = (String) dashboardData.get("type");

        csvPrinter.printRecord("Report Type", type);
        csvPrinter.printRecord("User", user.getFullName() + " (" + user.getEmail() + ")");
        csvPrinter.printRecord("Role", user.getRole().name());
        csvPrinter.printRecord("Generated", LocalDateTime.now().format(
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        csvPrinter.printRecord("", "");

        // Add stats based on type
        try {
            // Using reflection to get stats (simplified approach)
            if (stats != null) {
                csvPrinter.printRecord("Total Complaints", getFieldValue(stats, "totalComplaints"));
                csvPrinter.printRecord("New Complaints", getFieldValue(stats, "newComplaints"));
                csvPrinter.printRecord("In Progress Complaints", getFieldValue(stats, "inProgressComplaints"));
                csvPrinter.printRecord("Resolved Complaints", getFieldValue(stats, "resolvedComplaints"));
                csvPrinter.printRecord("Pending Escalations", getFieldValue(stats, "pendingEscalations"));
                csvPrinter.printRecord("Average Resolution Time", getFieldValue(stats, "averageResolutionTime"));
            }
        } catch (Exception e) {
            log.error("Error generating dashboard CSV", e);
        }

        csvPrinter.flush();
        csvPrinter.close();

        return writer.toString().getBytes();
    }

    // ========== PDF GENERATORS ==========

    private byte[] generateComplaintsPDF(java.util.List<Complaint> complaints, User user, Map<String, String> filters) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate());
        PdfWriter.getInstance(document, baos);

        document.open();

        // Title - Use fully qualified Font class name
        com.lowagie.text.Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
        Paragraph title = new Paragraph("Complaints Export Report", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(20);
        document.add(title);

        // User info
        com.lowagie.text.Font infoFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
        Paragraph userInfo = new Paragraph(
                String.format("Generated by: %s (%s) | Role: %s",
                        user.getFullName(), user.getEmail(), user.getRole().name()),
                infoFont);
        userInfo.setSpacingAfter(10);
        document.add(userInfo);

        // Filters info
        if (filters != null && !filters.isEmpty()) {
            Paragraph filterInfo = new Paragraph("Filters Applied:", infoFont);
            for (Map.Entry<String, String> entry : filters.entrySet()) {
                filterInfo.add(new Paragraph(
                        String.format("  • %s: %s", entry.getKey(), entry.getValue()),
                        infoFont));
            }
            filterInfo.setSpacingAfter(10);
            document.add(filterInfo);
        }

        // Summary
        Paragraph summary = new Paragraph(
                String.format("Total Complaints: %d | Generated: %s",
                        complaints.size(), LocalDateTime.now().format(
                                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))),
                infoFont);
        summary.setSpacingAfter(20);
        document.add(summary);

        // Table
        PdfPTable table = new PdfPTable(10);
        table.setWidthPercentage(100);

        // Headers
        String[] headers = {"ID", "Title", "Category", "Status", "Urgency",
                "Created", "Days Open", "User", "Employee", "Escalated"};

        com.lowagie.text.Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setPadding(5);
            table.addCell(cell);
        }

        // Data
        com.lowagie.text.Font dataFont = FontFactory.getFont(FontFactory.HELVETICA, 8);
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        for (Complaint complaint : complaints) {
            table.addCell(createCell(String.valueOf(complaint.getId()), dataFont));
            table.addCell(createCell(complaint.getTitle(), dataFont));
            table.addCell(createCell(complaint.getCategory(), dataFont));
            table.addCell(createCell(complaint.getStatus().name(), dataFont));
            table.addCell(createCell(complaint.getUrgency().name(), dataFont));
            table.addCell(createCell(
                    complaint.getCreatedAt().format(dateFormatter), dataFont));

            long daysOpen = java.time.Duration.between(
                    complaint.getCreatedAt(), LocalDateTime.now()).toDays();
            table.addCell(createCell(String.valueOf(daysOpen), dataFont));

            table.addCell(createCell(
                    complaint.getUser() != null ? complaint.getUser().getFullName() : "Anonymous",
                    dataFont));

            table.addCell(createCell(
                    complaint.getAssignedEmployee() != null ?
                            complaint.getAssignedEmployee().getFullName() : "N/A",
                    dataFont));

            table.addCell(createCell(
                    complaint.getEscalatedTo() != null ? "Yes" : "No",
                    dataFont));
        }

        document.add(table);
        document.close();

        return baos.toByteArray();
    }

    private byte[] generatePerformancePDF(Map<String, Object> performanceData, User user,
                                          Map<String, String> filters) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document();
        PdfWriter.getInstance(document, baos);

        document.open();

        // Title - Use fully qualified Font class name
        com.lowagie.text.Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
        Paragraph title = new Paragraph("Performance Report", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(20);
        document.add(title);

        // User info
        com.lowagie.text.Font infoFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
        Paragraph userInfo = new Paragraph(
                String.format("Employee: %s (%s)\nGenerated: %s",
                        user.getFullName(),
                        user.getEmail(),
                        LocalDateTime.now().format(
                                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))),
                infoFont);
        userInfo.setSpacingAfter(20);
        document.add(userInfo);

        // Key Metrics Table
        com.lowagie.text.Font metricTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
        Paragraph metricsTitle = new Paragraph("Key Performance Metrics", metricTitleFont);
        metricsTitle.setSpacingAfter(10);
        document.add(metricsTitle);

        PdfPTable metricsTable = new PdfPTable(2);
        metricsTable.setWidthPercentage(80);
        metricsTable.setHorizontalAlignment(Element.ALIGN_CENTER);

        com.lowagie.text.Font metricHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
        com.lowagie.text.Font metricValueFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

        addMetricRow(metricsTable, "Total Complaints",
                performanceData.get("totalComplaints").toString(),
                metricHeaderFont, metricValueFont);
        addMetricRow(metricsTable, "New Complaints",
                performanceData.get("newComplaints").toString(),
                metricHeaderFont, metricValueFont);
        addMetricRow(metricsTable, "In Progress Complaints",
                performanceData.get("inProgressComplaints").toString(),
                metricHeaderFont, metricValueFont);
        addMetricRow(metricsTable, "Resolved Complaints",
                performanceData.get("resolvedComplaints").toString(),
                metricHeaderFont, metricValueFont);
        addMetricRow(metricsTable, "Escalated Complaints",
                performanceData.get("escalatedComplaints").toString(),
                metricHeaderFont, metricValueFont);
        addMetricRow(metricsTable, "Resolution Rate",
                String.format("%.2f%%", performanceData.get("resolutionRate")),
                metricHeaderFont, metricValueFont);
        addMetricRow(metricsTable, "Avg Resolution Time",
                String.format("%.1f hours", performanceData.get("averageResolutionTime")),
                metricHeaderFont, metricValueFont);

        document.add(metricsTable);
        document.add(new Paragraph(" "));

        // Distribution Tables
        @SuppressWarnings("unchecked")
        Map<String, Long> categoryDist = (Map<String, Long>) performanceData.get("categoryDistribution");
        @SuppressWarnings("unchecked")
        Map<String, Long> statusDist = (Map<String, Long>) performanceData.get("statusDistribution");

        if (!categoryDist.isEmpty() || !statusDist.isEmpty()) {
            PdfPTable distributionTable = new PdfPTable(2);
            distributionTable.setWidthPercentage(100);

            // Category Distribution
            if (!categoryDist.isEmpty()) {
                PdfPCell categoryCell = new PdfPCell();
                categoryCell.addElement(new Paragraph("Category Distribution", metricTitleFont));
                categoryCell.addElement(createDistributionTable(categoryDist));
                distributionTable.addCell(categoryCell);
            }

            // Status Distribution
            if (!statusDist.isEmpty()) {
                PdfPCell statusCell = new PdfPCell();
                statusCell.addElement(new Paragraph("Status Distribution", metricTitleFont));
                statusCell.addElement(createDistributionTable(statusDist));
                distributionTable.addCell(statusCell);
            }

            document.add(distributionTable);
        }

        document.close();

        return baos.toByteArray();
    }

    private byte[] generateDashboardPDF(Map<String, Object> dashboardData, User user) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document();
        PdfWriter.getInstance(document, baos);

        document.open();

        // Title - Use fully qualified Font class name
        com.lowagie.text.Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
        String reportType = (String) dashboardData.get("type");
        String titleText = reportType.replace("_", " ") + " Report";
        Paragraph title = new Paragraph(titleText, titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(20);
        document.add(title);

        // User info
        com.lowagie.text.Font infoFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
        Paragraph userInfo = new Paragraph(
                String.format("User: %s (%s)\nRole: %s\nGenerated: %s",
                        user.getFullName(),
                        user.getEmail(),
                        user.getRole().name(),
                        LocalDateTime.now().format(
                                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))),
                infoFont);
        userInfo.setSpacingAfter(20);
        document.add(userInfo);

        Object stats = dashboardData.get("stats");
        if (stats != null) {
            com.lowagie.text.Font metricTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Paragraph metricsTitle = new Paragraph("Dashboard Statistics", metricTitleFont);
            metricsTitle.setSpacingAfter(10);
            document.add(metricsTitle);

            PdfPTable metricsTable = new PdfPTable(2);
            metricsTable.setWidthPercentage(80);
            metricsTable.setHorizontalAlignment(Element.ALIGN_CENTER);

            com.lowagie.text.Font metricHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
            com.lowagie.text.Font metricValueFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

            try {
                addMetricRow(metricsTable, "Total Complaints",
                        getFieldValue(stats, "totalComplaints"), metricHeaderFont, metricValueFont);
                addMetricRow(metricsTable, "New Complaints",
                        getFieldValue(stats, "newComplaints"), metricHeaderFont, metricValueFont);
                addMetricRow(metricsTable, "In Progress Complaints",
                        getFieldValue(stats, "inProgressComplaints"), metricHeaderFont, metricValueFont);
                addMetricRow(metricsTable, "Resolved Complaints",
                        getFieldValue(stats, "resolvedComplaints"), metricHeaderFont, metricValueFont);
                addMetricRow(metricsTable, "Pending Escalations",
                        getFieldValue(stats, "pendingEscalations"), metricHeaderFont, metricValueFont);
                addMetricRow(metricsTable, "Avg Resolution Time",
                        getFieldValue(stats, "averageResolutionTime"), metricHeaderFont, metricValueFont);
            } catch (Exception e) {
                log.error("Error adding metrics to PDF", e);
            }

            document.add(metricsTable);
        }

        document.close();

        return baos.toByteArray();
    }

    // ========== EXCEL GENERATORS ==========

    private byte[] generateComplaintsExcel(java.util.List<Complaint> complaints, User user, Map<String, String> filters) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Complaints");

            // Create header row - Use fully qualified Row class name for POI
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            String[] headers = {"ID", "Title", "Category", "Description", "Status",
                    "Urgency", "Anonymous", "Created At", "Updated At",
                    "User Name", "User Email", "Assigned Employee",
                    "Escalated To", "Escalation Reason"};

            CellStyle headerStyle = workbook.createCellStyle();
            // Use fully qualified Font class name for POI
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Create data rows
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            int rowNum = 1;

            for (Complaint complaint : complaints) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowNum++);

                row.createCell(0).setCellValue(complaint.getId());
                row.createCell(1).setCellValue(complaint.getTitle());
                row.createCell(2).setCellValue(complaint.getCategory());
                row.createCell(3).setCellValue(complaint.getDescription());
                row.createCell(4).setCellValue(complaint.getStatus().name());
                row.createCell(5).setCellValue(complaint.getUrgency().name());
                row.createCell(6).setCellValue(complaint.getAnonymous() ? "Yes" : "No");
                row.createCell(7).setCellValue(complaint.getCreatedAt().format(formatter));
                row.createCell(8).setCellValue(complaint.getUpdatedAt().format(formatter));
                row.createCell(9).setCellValue(
                        complaint.getUser() != null ? complaint.getUser().getFullName() : "Anonymous");
                row.createCell(10).setCellValue(
                        complaint.getUser() != null ? complaint.getUser().getEmail() : "");
                row.createCell(11).setCellValue(
                        complaint.getAssignedEmployee() != null ?
                                complaint.getAssignedEmployee().getFullName() : "");
                row.createCell(12).setCellValue(
                        complaint.getEscalatedTo() != null ?
                                complaint.getEscalatedTo().getFullName() : "");
                row.createCell(13).setCellValue(
                        complaint.getEscalationReason() != null ?
                                complaint.getEscalationReason() : "");
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(baos);
        }

        return baos.toByteArray();
    }

    private byte[] generatePerformanceExcel(Map<String, Object> performanceData, User user) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (Workbook workbook = new XSSFWorkbook()) {
            // Summary Sheet
            Sheet summarySheet = workbook.createSheet("Summary");

            org.apache.poi.ss.usermodel.Row headerRow = summarySheet.createRow(0);
            headerRow.createCell(0).setCellValue("Metric");
            headerRow.createCell(1).setCellValue("Value");

            int rowNum = 1;
            addExcelRow(summarySheet, rowNum++, "Employee Name", user.getFullName());
            addExcelRow(summarySheet, rowNum++, "Employee Email", user.getEmail());
            addExcelRow(summarySheet, rowNum++, "Report Date",
                    LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
            rowNum++;

            addExcelRow(summarySheet, rowNum++, "Total Complaints",
                    performanceData.get("totalComplaints"));
            addExcelRow(summarySheet, rowNum++, "New Complaints",
                    performanceData.get("newComplaints"));
            addExcelRow(summarySheet, rowNum++, "In Progress Complaints",
                    performanceData.get("inProgressComplaints"));
            addExcelRow(summarySheet, rowNum++, "Resolved Complaints",
                    performanceData.get("resolvedComplaints"));
            addExcelRow(summarySheet, rowNum++, "Escalated Complaints",
                    performanceData.get("escalatedComplaints"));
            addExcelRow(summarySheet, rowNum++, "Resolution Rate (%)",
                    performanceData.get("resolutionRate"));
            addExcelRow(summarySheet, rowNum++, "Average Resolution Time (hours)",
                    performanceData.get("averageResolutionTime"));

            // Category Distribution Sheet
            @SuppressWarnings("unchecked")
            Map<String, Long> categoryDist = (Map<String, Long>) performanceData.get("categoryDistribution");
            if (!categoryDist.isEmpty()) {
                Sheet categorySheet = workbook.createSheet("Category Distribution");

                org.apache.poi.ss.usermodel.Row categoryHeader = categorySheet.createRow(0);
                categoryHeader.createCell(0).setCellValue("Category");
                categoryHeader.createCell(1).setCellValue("Count");

                int catRowNum = 1;
                for (Map.Entry<String, Long> entry : categoryDist.entrySet()) {
                    org.apache.poi.ss.usermodel.Row row = categorySheet.createRow(catRowNum++);
                    row.createCell(0).setCellValue(entry.getKey());
                    row.createCell(1).setCellValue(entry.getValue());
                }
            }

            // Status Distribution Sheet
            @SuppressWarnings("unchecked")
            Map<String, Long> statusDist = (Map<String, Long>) performanceData.get("statusDistribution");
            if (!statusDist.isEmpty()) {
                Sheet statusSheet = workbook.createSheet("Status Distribution");

                org.apache.poi.ss.usermodel.Row statusHeader = statusSheet.createRow(0);
                statusHeader.createCell(0).setCellValue("Status");
                statusHeader.createCell(1).setCellValue("Count");

                int statusRowNum = 1;
                for (Map.Entry<String, Long> entry : statusDist.entrySet()) {
                    org.apache.poi.ss.usermodel.Row row = statusSheet.createRow(statusRowNum++);
                    row.createCell(0).setCellValue(entry.getKey());
                    row.createCell(1).setCellValue(entry.getValue());
                }
            }

            // Auto-size columns
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                Sheet sheet = workbook.getSheetAt(i);
                for (int j = 0; j < 2; j++) {
                    sheet.autoSizeColumn(j);
                }
            }

            workbook.write(baos);
        }

        return baos.toByteArray();
    }

    private byte[] generateDashboardExcel(Map<String, Object> dashboardData, User user) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Dashboard Report");

            int rowNum = 0;
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(rowNum++);
            headerRow.createCell(0).setCellValue("Dashboard Report");
            headerRow.createCell(1).setCellValue("");

            addExcelRow(sheet, rowNum++, "Report Type", dashboardData.get("type"));
            addExcelRow(sheet, rowNum++, "User", user.getFullName() + " (" + user.getEmail() + ")");
            addExcelRow(sheet, rowNum++, "Role", user.getRole().name());
            addExcelRow(sheet, rowNum++, "Generated", LocalDateTime.now().format(
                    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
            rowNum++;

            Object stats = dashboardData.get("stats");
            if (stats != null) {
                addExcelRow(sheet, rowNum++, "Total Complaints", getFieldValue(stats, "totalComplaints"));
                addExcelRow(sheet, rowNum++, "New Complaints", getFieldValue(stats, "newComplaints"));
                addExcelRow(sheet, rowNum++, "In Progress Complaints", getFieldValue(stats, "inProgressComplaints"));
                addExcelRow(sheet, rowNum++, "Resolved Complaints", getFieldValue(stats, "resolvedComplaints"));
                addExcelRow(sheet, rowNum++, "Pending Escalations", getFieldValue(stats, "pendingEscalations"));
                addExcelRow(sheet, rowNum++, "Average Resolution Time", getFieldValue(stats, "averageResolutionTime"));
            }

            // Auto-size columns
            sheet.autoSizeColumn(0);
            sheet.autoSizeColumn(1);

            workbook.write(baos);
        }

        return baos.toByteArray();
    }

    // ========== HELPER METHODS ==========

    private PdfPCell createCell(String text, com.lowagie.text.Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(5);
        return cell;
    }

    private void addMetricRow(PdfPTable table, String metric, String value,
                              com.lowagie.text.Font headerFont, com.lowagie.text.Font valueFont) {
        PdfPCell metricCell = new PdfPCell(new Phrase(metric, headerFont));
        metricCell.setPadding(5);
        table.addCell(metricCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setPadding(5);
        table.addCell(valueCell);
    }

    private PdfPTable createDistributionTable(Map<String, Long> distribution) {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);

        com.lowagie.text.Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        com.lowagie.text.Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

        for (Map.Entry<String, Long> entry : distribution.entrySet()) {
            table.addCell(createCell(entry.getKey(), valueFont));
            table.addCell(createCell(entry.getValue().toString(), valueFont));
        }

        return table;
    }

    private void addExcelRow(Sheet sheet, int rowNum, String metric, Object value) {
        org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowNum);
        row.createCell(0).setCellValue(metric);

        if (value instanceof String) {
            row.createCell(1).setCellValue((String) value);
        } else if (value instanceof Number) {
            row.createCell(1).setCellValue(((Number) value).doubleValue());
        } else {
            row.createCell(1).setCellValue(String.valueOf(value));
        }
    }

    private String getFieldValue(Object obj, String fieldName) {
        try {
            java.lang.reflect.Field field = obj.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            Object value = field.get(obj);
            return value != null ? value.toString() : "";
        } catch (Exception e) {
            return "";
        }
    }
}