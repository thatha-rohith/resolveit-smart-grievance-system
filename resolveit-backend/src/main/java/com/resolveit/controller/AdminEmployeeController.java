package com.resolveit.controller;

import com.resolveit.model.User;
import com.resolveit.repository.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/employees")
public class AdminEmployeeController {

    private final UserRepository userRepo;

    public AdminEmployeeController(UserRepository userRepo) {
        this.userRepo = userRepo;
    }

    @GetMapping
    public List<User> employees() {
        return userRepo.findAll()
                .stream()
                .filter(u -> u.getRole() == User.Role.EMPLOYEE)
                .toList();
    }
}