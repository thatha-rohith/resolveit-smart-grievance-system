package com.resolveit.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/debug")
public class DebugAuthController {

    @GetMapping("/security-context")
    public Map<String, Object> getSecurityContext(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        Map<String, Object> response = new HashMap<>();

        response.put("timestamp", System.currentTimeMillis());
        response.put("authHeaderPresent", authHeader != null);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated()) {
            response.put("authenticated", true);
            response.put("principal", auth.getPrincipal().toString());
            response.put("name", auth.getName());
            response.put("authorities", auth.getAuthorities().toString());

            if (auth.getPrincipal() instanceof UserDetails) {
                UserDetails userDetails = (UserDetails) auth.getPrincipal();
                response.put("userDetails", Map.of(
                        "username", userDetails.getUsername(),
                        "authorities", userDetails.getAuthorities().toString(),
                        "enabled", userDetails.isEnabled(),
                        "accountNonExpired", userDetails.isAccountNonExpired(),
                        "credentialsNonExpired", userDetails.isCredentialsNonExpired(),
                        "accountNonLocked", userDetails.isAccountNonLocked()
                ));
            }
        } else {
            response.put("authenticated", false);
            response.put("message", "No authentication found in SecurityContext");
        }

        return response;
    }

    @GetMapping("/test-complaints-access")
    public Map<String, Object> testComplaintsAccess() {
        Map<String, Object> response = new HashMap<>();

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated()) {
            response.put("status", "ACCESS_GRANTED");
            response.put("user", auth.getName());
            response.put("authorities", auth.getAuthorities().toString());
            response.put("message", "User can access complaints endpoints");
        } else {
            response.put("status", "ACCESS_DENIED");
            response.put("message", "User not authenticated");
        }

        return response;
    }
}