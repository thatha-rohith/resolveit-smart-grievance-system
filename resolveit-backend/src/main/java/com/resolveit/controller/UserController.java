package com.resolveit.controller;

import com.resolveit.model.User;
import com.resolveit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/senior-employees")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SENIOR_EMPLOYEE')")
    public ResponseEntity<?> getSeniorEmployees() {
        try {
            List<User> seniorEmployees = userRepository.findAll()
                    .stream()
                    .filter(user -> user.getRole() == User.Role.SENIOR_EMPLOYEE)
                    .collect(Collectors.toList());

            List<Map<String, Object>> response = seniorEmployees.stream()
                    .map(user -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", user.getId());
                        map.put("fullName", user.getFullName());
                        map.put("email", user.getEmail());
                        map.put("role", user.getRole().name());
                        return map;
                    })
                    .collect(Collectors.toList());

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("data", response);
            result.put("count", response.size());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to fetch senior employees: " + e.getMessage());

            return ResponseEntity.internalServerError().body(error);
        }
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllUsers() {
        try {
            List<User> users = userRepository.findAll();

            List<Map<String, Object>> response = users.stream()
                    .map(user -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", user.getId());
                        map.put("fullName", user.getFullName());
                        map.put("email", user.getEmail());
                        map.put("role", user.getRole().name());
                        return map;
                    })
                    .collect(Collectors.toList());

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("data", response);
            result.put("count", response.size());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to fetch users: " + e.getMessage());

            return ResponseEntity.internalServerError().body(error);
        }
    }

    @GetMapping("/employees")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllEmployees() {
        try {
            List<User> employees = userRepository.findAll()
                    .stream()
                    .filter(user -> user.getRole() == User.Role.EMPLOYEE ||
                            user.getRole() == User.Role.SENIOR_EMPLOYEE)
                    .collect(Collectors.toList());

            List<Map<String, Object>> response = employees.stream()
                    .map(user -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", user.getId());
                        map.put("fullName", user.getFullName());
                        map.put("email", user.getEmail());
                        map.put("role", user.getRole().name());
                        return map;
                    })
                    .collect(Collectors.toList());

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("data", response);
            result.put("count", response.size());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Failed to fetch employees: " + e.getMessage());

            return ResponseEntity.internalServerError().body(error);
        }
    }
}