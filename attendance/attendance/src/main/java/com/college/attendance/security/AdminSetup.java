
package com.college.attendance.security;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminSetup implements ApplicationRunner {

    private final AppUserRepository repository;
    private final PasswordEncoder passwordEncoder;

    public AdminSetup(
            AppUserRepository repository,
            PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        String username = System.getenv("ATTENDANCE_ADMIN_USERNAME");
        String password = System.getenv("ATTENDANCE_ADMIN_PASSWORD");

        if (username == null || username.isBlank()
                || password == null || password.length() < 12) {
            System.out.println(
                "Admin setup skipped. Set ATTENDANCE_ADMIN_USERNAME and " +
                "ATTENDANCE_ADMIN_PASSWORD (minimum 12 characters)."
            );
            return;
        }

        if (!repository.existsByUsername(username)) {
            AppUser admin = new AppUser(
                username,
                passwordEncoder.encode(password),
                "ADMIN"
            );
            repository.save(admin);
            System.out.println("Initial ADMIN account created.");
        } else {
            System.out.println("ADMIN username already exists; no changes made.");
        }
    }
}
