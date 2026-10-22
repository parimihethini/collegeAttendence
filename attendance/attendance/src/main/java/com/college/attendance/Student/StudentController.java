package com.college.attendance.Student;

import com.college.attendance.attendancerecord.AttendanceRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentRepository repository;
    private final AttendanceRepository attendanceRepository;

    public StudentController(
            StudentRepository repository,
            AttendanceRepository attendanceRepository) {
        this.repository = repository;
        this.attendanceRepository = attendanceRepository;
    }

    @GetMapping
    public List<Student> getStudents() {
        return repository.findByActiveTrue();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Student addStudent(@RequestBody Student student) {
        validateStudent(student);

        student.setName(student.getName().trim());
        student.setRollNumber(
                student.getRollNumber().trim()
        );

        if (student.getDepartment() != null) {
            student.setDepartment(student.getDepartment().trim());
        }

        if (student.getYear() != null
                && !List.of("1", "2", "3", "4")
                        .contains(student.getYear().trim())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Year must be 1, 2, 3, or 4"
            );
        }

        student.setActive(true);

        if (repository.existsByRollNumber(student.getRollNumber())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Roll number already exists"
            );
        }

        try {
            return repository.saveAndFlush(student);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Roll number already exists"
            );
        }
    }

    @PutMapping("/{id}")
    public Student updateStudent(
            @PathVariable Long id,
            @RequestBody Student updatedStudent) {

        validateStudent(updatedStudent);

        Student existingStudent = repository.findById(id)
                .filter(Student::isActive)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Active student not found"
                ));

        String name = updatedStudent.getName().trim();
        String rollNumber = updatedStudent.getRollNumber().trim();

        boolean duplicateRollNumber =
                repository.existsByRollNumber(rollNumber)
                && !existingStudent.getRollNumber()
                        .equalsIgnoreCase(rollNumber);

        if (duplicateRollNumber) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Roll number already exists"
            );
        }

        if (updatedStudent.getYear() != null
                && !List.of("1", "2", "3", "4")
                        .contains(updatedStudent.getYear().trim())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Year must be 1, 2, 3, or 4"
            );
        }

        existingStudent.setName(name);
        existingStudent.setRollNumber(rollNumber);
        existingStudent.setDepartment(
                updatedStudent.getDepartment() == null
                        ? null
                        : updatedStudent.getDepartment().trim()
        );
        existingStudent.setYear(updatedStudent.getYear());

        try {
            return repository.saveAndFlush(existingStudent);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Roll number already exists"
            );
        }
    }

    // Permanently delete the student and all their attendance history.
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteStudent(@PathVariable Long id) {
        Student student = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Student not found"
                ));

        attendanceRepository.deleteByStudentId(id);
        repository.delete(student);
    }

    private void validateStudent(Student student) {
        if (student == null
                || student.getName() == null
                || student.getName().isBlank()
                || student.getRollNumber() == null
                || student.getRollNumber().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Name and roll number are required"
            );
        }

        if (student.getName().trim().length() > 150) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Student name cannot exceed 150 characters"
            );
        }

        if (student.getRollNumber().trim().length() > 50) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Roll number cannot exceed 50 characters"
            );
        }
    }
}
