package com.resolveit.controller;

import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/test")
@CrossOrigin(origins = "*")
public class TestController {

    @GetMapping("/cors")
    public String testCors() {
        return "CORS is working! Timestamp: " + System.currentTimeMillis();
    }

    @GetMapping("/simple-json")
    public Map<String, Object> simpleJson() {
        Map<String, Object> response = new HashMap<>();
        response.put("id", 1);
        response.put("title", "Test Complaint");
        response.put("category", "Test");
        response.put("description", "This is a test complaint");
        response.put("status", "NEW");
        response.put("urgency", "NORMAL");
        response.put("anonymous", false);
        response.put("createdAt", new Date());
        response.put("updatedAt", new Date());

        Map<String, Object> user = new HashMap<>();
        user.put("id", 100);
        user.put("fullName", "Test User");
        response.put("user", user);

        return response;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "TestController");
        health.put("timestamp", new Date());
        health.put("version", "1.0");
        return health;
    }
}