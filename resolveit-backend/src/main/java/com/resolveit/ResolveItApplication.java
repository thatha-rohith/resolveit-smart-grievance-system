package com.resolveit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class ResolveItApplication {
    public static void main(String[] args) {
        SpringApplication.run(ResolveItApplication.class, args);
        System.out.println("✅ ResolveIt Application Started Successfully!");
    }
}