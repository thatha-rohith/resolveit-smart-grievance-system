package com.resolveit.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // ==================== PUBLIC ENDPOINTS ====================
                        .requestMatchers("/").permitAll()
                        .requestMatchers("/auth/**").permitAll()
                        .requestMatchers("/public/**").permitAll()
                        .requestMatchers("/test/**").permitAll()
                        .requestMatchers("/debug/**").permitAll()
                        .requestMatchers("/simple-public/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()

                        // ==================== COMMENTS ENDPOINTS ====================
                        .requestMatchers("/complaints/*/comments").permitAll()  // GET comments - public
                        .requestMatchers("/complaints/*/comments/count").permitAll()  // GET comment count - public

                        // ==================== LIKE ENDPOINTS ====================
                        .requestMatchers("/complaints/*/like/count").permitAll()  // GET like count - public
                        .requestMatchers("/complaints/*/like/status").permitAll()  // GET like status - public

                        // ==================== ATTACHMENT ENDPOINTS ====================
                        .requestMatchers("/complaints/*/attachments").permitAll()  // GET attachments - public (FIXED)
                        .requestMatchers("/complaints/*/attachments/**").permitAll()  // GET specific attachment - public (FIXED)

                        // ==================== COMPLAINT ENDPOINTS ====================
                        .requestMatchers("/complaints/*").permitAll()  // GET complaint details - public
                        .requestMatchers("/complaints/escalated/my").authenticated()  // Get my escalated complaints

                        // ==================== COMPLAINT SUBMISSION ====================
                        .requestMatchers("/complaints/submit").authenticated()  // Submit complaint (non-anonymous)
                        .requestMatchers("/complaints/submit-with-attachments").permitAll()  // Allow anonymous complaint submission with files

                        // ==================== ADMIN ENDPOINTS ====================
                        .requestMatchers("/admin/**").hasRole("ADMIN")

                        // ==================== EMPLOYEE ENDPOINTS ====================
                        .requestMatchers("/employee/**").hasAnyRole("EMPLOYEE", "SENIOR_EMPLOYEE", "ADMIN")

                        // ==================== DASHBOARD ENDPOINTS ====================
                        .requestMatchers("/api/dashboard/**").authenticated()

                        // ==================== ESCALATION ENDPOINTS ====================
                        .requestMatchers("/api/complaints/*/escalate").hasAnyRole("ADMIN", "SENIOR_EMPLOYEE")  // Manual escalation
                        .requestMatchers("/api/escalated-complaints").hasAnyRole("EMPLOYEE", "SENIOR_EMPLOYEE", "ADMIN")  // View escalated
                        .requestMatchers("/api/complaints/requiring-escalation").hasRole("ADMIN")  // View complaints needing escalation
                        .requestMatchers("/api/escalation/stats").hasAnyRole("ADMIN", "SENIOR_EMPLOYEE")  // Escalation statistics
                        .requestMatchers("/api/escalation/**").hasRole("ADMIN")  // Escalation test/trigger endpoints

                        // ==================== NOTES ENDPOINTS ====================
                        .requestMatchers("/api/complaints/*/notes").authenticated()
                        .requestMatchers("/api/notes/**").authenticated()

                        // ==================== EXPORT ENDPOINTS ====================
                        .requestMatchers("/api/export/**").authenticated()

                        // ==================== SENIOR REQUEST ENDPOINTS ====================
                        .requestMatchers("/api/senior-requests").hasRole("EMPLOYEE")  // Submit request
                        .requestMatchers("/api/senior-requests/my-request").hasRole("EMPLOYEE")  // View my request
                        .requestMatchers("/api/senior-requests/eligibility").hasRole("EMPLOYEE")  // Check eligibility
                        .requestMatchers("/api/senior-requests/admin/**").hasRole("ADMIN")  // Admin endpoints
                        .requestMatchers("/api/senior-requests/**").authenticated()  // Other senior request endpoints

                        // ==================== EMPLOYEE REQUEST ENDPOINTS ====================
                        .requestMatchers("/api/employee-request/**").authenticated()

                        // ==================== USER ENDPOINTS ====================
                        .requestMatchers("/api/users/senior-employees").authenticated()  // View senior employees
                        .requestMatchers("/api/users/**").hasRole("ADMIN")  // User management - admin only

                        // ==================== AUTHENTICATED COMPLAINT ENDPOINTS ====================
                        .requestMatchers("/complaints/my").authenticated()  // Get my complaints
                        .requestMatchers("/complaints/*/comments").authenticated()  // POST comments
                        .requestMatchers("/complaints/*/like").authenticated()  // POST like
                        .requestMatchers("/complaints/*/status").authenticated()  // Update status
                        .requestMatchers("/complaints/*/attachments").authenticated()  // POST upload attachments (only for non-anonymous)

                        // Allow DELETE on attachments only for admins (handled by @PreAuthorize in controller)
                        .requestMatchers("/attachments/**").authenticated()

                        // ==================== DEFAULT RULE ====================
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:3000", "http://localhost:5173"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Type", "Content-Disposition"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}