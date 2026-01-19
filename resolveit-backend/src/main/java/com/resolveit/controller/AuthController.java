package com.resolveit.controller;

import com.resolveit.dto.LoginRequest;
import com.resolveit.dto.RegisterRequest;
import com.resolveit.model.User;
import com.resolveit.repository.UserRepository;
import com.resolveit.security.JwtService;
import com.resolveit.service.EmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService; // Add EmailService

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            log.info("Register request for email: {}", request.getEmail());

            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Email already exists"));
            }

            User user = new User();
            user.setFullName(request.getName());
            user.setEmail(request.getEmail());
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setRole(User.Role.USER);

            User savedUser = userRepository.save(user);
            log.info("User registered successfully: {}", savedUser.getEmail());

            // ✅ SEND WELCOME EMAIL TO YOPMAIL (Async - won't block registration)
            try {
                emailService.sendWelcomeEmail(savedUser.getEmail(), savedUser.getFullName());
                log.info("📧 Welcome email triggered for: {}", savedUser.getEmail());
            } catch (Exception emailError) {
                // Don't fail registration if email fails
                log.warn("⚠️ Email sending failed for {}: {}", savedUser.getEmail(), emailError.getMessage());
            }

            UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                    .username(savedUser.getEmail())
                    .password(savedUser.getPassword())
                    .authorities("ROLE_" + savedUser.getRole().name())
                    .build();

            String token = jwtService.generateToken(userDetails);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "token", token,
                    "user", Map.of(
                            "id", savedUser.getId(),
                            "email", savedUser.getEmail(),
                            "fullName", savedUser.getFullName(),
                            "role", savedUser.getRole().name()
                    )
            ));
        } catch (Exception e) {
            log.error("Registration error: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Registration failed: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            log.info("Login attempt for email: {}", request.getEmail());

            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String token = jwtService.generateToken((UserDetails) authentication.getPrincipal());

            log.info("Login successful for user: {}", user.getEmail());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "token", token,
                    "user", Map.of(
                            "id", user.getId(),
                            "email", user.getEmail(),
                            "fullName", user.getFullName(),
                            "role", user.getRole().name()
                    )
            ));
        } catch (Exception e) {
            log.error("Login failed for email {}: {}", request.getEmail(), e.getMessage());
            return ResponseEntity.status(401)
                    .body(Map.of(
                            "success", false,
                            "error", "Invalid email or password"
                    ));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(401)
                        .body(Map.of("error", "No token provided"));
            }

            String token = authHeader.substring(7);
            String email = jwtService.extractUsername(token);

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "user", Map.of(
                            "id", user.getId(),
                            "email", user.getEmail(),
                            "fullName", user.getFullName(),
                            "role", user.getRole().name()
                    )
            ));
        } catch (Exception e) {
            log.error("Error getting current user: {}", e.getMessage());
            return ResponseEntity.status(401)
                    .body(Map.of(
                            "success", false,
                            "error", "Invalid token"
                    ));
        }
    }

    /**
     * Test endpoint to verify email configuration
     * Send a GET request to: http://localhost:8080/auth/test-email?email=test@yopmail.com
     */
    @GetMapping("/test-email")
    public ResponseEntity<?> testEmail(@RequestParam String email) {
        try {
            log.info("Testing email configuration for: {}", email);
            emailService.sendTestEmail(email);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Test email sent to " + email
            ));
        } catch (Exception e) {
            log.error("Test email failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Failed to send test email: " + e.getMessage()
            ));
        }
    }
}