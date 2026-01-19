package com.resolveit.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/debug")
@CrossOrigin(origins = "*")
public class DebugController {

    @GetMapping("/headers")
    public Map<String, Object> getHeaders(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();

        // Headers
        Map<String, String> headers = new HashMap<>();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            headers.put(headerName, request.getHeader(headerName));
        }
        response.put("headers", headers);

        // Request info
        response.put("method", request.getMethod());
        response.put("requestURI", request.getRequestURI());
        response.put("remoteAddr", request.getRemoteAddr());
        response.put("serverPort", request.getServerPort());

        return response;
    }

    @GetMapping("/cors-check")
    public Map<String, String> corsCheck() {
        return Collections.singletonMap("message",
                "CORS should work if you see this from localhost:3000");
    }
}
