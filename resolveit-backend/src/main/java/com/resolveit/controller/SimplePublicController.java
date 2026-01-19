package com.resolveit.controller;

import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/simple-public")
@CrossOrigin(origins = "*")
public class SimplePublicController {

    @GetMapping("/test")
    public Map<String, Object> simpleTest() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Simple public endpoint works!");
        response.put("timestamp", new Date());
        response.put("data", Arrays.asList(
                Map.of("id", 1, "title", "Test Complaint 1"),
                Map.of("id", 2, "title", "Test Complaint 2")
        ));
        return response;
    }

    @GetMapping("/echo/{message}")
    public Map<String, Object> echo(@PathVariable String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("original", message);
        response.put("echo", message.toUpperCase());
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "SimplePublicController");
        response.put("timestamp", new Date());
        response.put("javaVersion", System.getProperty("java.version"));
        return response;
    }
}
