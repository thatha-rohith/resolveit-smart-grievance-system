package com.resolveit.controller;

import com.resolveit.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class TokenController {

    private final JwtService jwtService;

    @GetMapping("/validate-token")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("valid", false, "message", "No token provided"));
        }

        try {
            String token = authHeader.substring(7);
            String username = jwtService.extractUsername(token);

            if (username == null) {
                return ResponseEntity.ok(Map.of("valid", false, "message", "Invalid token"));
            }

            return ResponseEntity.ok(Map.of(
                    "valid", true,
                    "username", username,
                    "message", "Token is valid"
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "valid", false,
                    "message", "Token validation failed: " + e.getMessage()
            ));
        }
    }
}