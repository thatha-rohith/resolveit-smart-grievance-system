package com.resolveit.controller;

import com.resolveit.dto.DashboardStatsDTO;
import com.resolveit.model.User;
import com.resolveit.repository.UserRepository;
import com.resolveit.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserRepository userRepository;

    @GetMapping("/admin")
    public ResponseEntity<?> getAdminDashboard(Authentication authentication) {
        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (user.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", "Only admins can access admin dashboard"
                ));
            }

            DashboardStatsDTO stats = dashboardService.getAdminDashboardStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to load admin dashboard",
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/employee")
    public ResponseEntity<?> getEmployeeDashboard(Authentication authentication) {
        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (user.getRole() != User.Role.EMPLOYEE &&
                    user.getRole() != User.Role.SENIOR_EMPLOYEE &&
                    user.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", "Only employees can access employee dashboard"
                ));
            }

            DashboardStatsDTO stats = dashboardService.getEmployeeDashboardStats(user);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to load employee dashboard",
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/user")
    public ResponseEntity<?> getUserDashboard(Authentication authentication) {
        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            DashboardStatsDTO stats = dashboardService.getUserDashboardStats(user);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to load user dashboard",
                    "message", e.getMessage()
            ));
        }
    }

    // ADD THIS NEW ENDPOINT FOR SENIOR EMPLOYEES
    @GetMapping("/senior")
    public ResponseEntity<?> getSeniorDashboard(Authentication authentication) {
        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (user.getRole() != User.Role.SENIOR_EMPLOYEE && user.getRole() != User.Role.ADMIN) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", "Only senior employees and admins can access senior dashboard"
                ));
            }

            // Senior dashboard can use the same stats as employee dashboard
            // You can customize this later if needed
            DashboardStatsDTO stats = dashboardService.getEmployeeDashboardStats(user);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to load senior dashboard",
                    "message", e.getMessage()
            ));
        }
    }
}