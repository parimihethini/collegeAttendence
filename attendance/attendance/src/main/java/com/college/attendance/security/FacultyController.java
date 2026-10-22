
package com.college.attendance.security;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/faculty")
public class FacultyController {

    private final AppUserRepository repository;
    private final PasswordEncoder passwordEncoder;

    public FacultyController(
            AppUserRepository repository,
            PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> createFaculty(
            @RequestBody FacultyRequest request) {

        if (request == null
                || request.username() == null
                || request.username().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Username is required");
        }

        String username = request.username().trim();

        if (username.length() > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Username cannot exceed 100 characters");
        }

        if (request.password() == null
                || request.password().length() < 12) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password must be at least 12 characters");
        }

        if (repository.existsByUsername(username)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Username already exists");
        }

        AppUser faculty = new AppUser(
                username,
                passwordEncoder.encode(request.password()),
                "FACULTY");

        try {
            AppUser savedFaculty = repository.saveAndFlush(faculty);

            return Map.of(
                    "message", "Faculty account created successfully",
                    "username", savedFaculty.getUsername(),
                    "role", savedFaculty.getRole());

        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Username already exists");
        }
    }

    public record FacultyRequest(
            String username,
            String password) {
    }
}
