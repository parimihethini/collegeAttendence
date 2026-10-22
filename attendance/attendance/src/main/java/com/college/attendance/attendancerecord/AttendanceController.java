package com.college.attendance.attendancerecord;

import com.college.attendance.Student.Student;
import com.college.attendance.Student.StudentRepository;
import com.college.attendance.attendancerecord.dto.AttendanceSessionRequest;
import com.college.attendance.attendancerecord.dto.AttendanceSessionResponse;
import jakarta.transaction.Transactional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceRepository attendanceRepository;
    private final StudentRepository studentRepository;

    public AttendanceController(
            AttendanceRepository attendanceRepository,
            StudentRepository studentRepository) {
        this.attendanceRepository = attendanceRepository;
        this.studentRepository = studentRepository;
    }

    /**
     * Bulk-submit one class session. The entire transaction is rolled back if
     * validation or persistence fails. Saved attendance is never overwritten.
     */
    @PostMapping("/session")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public AttendanceSessionResponse submitSession(
            @RequestBody AttendanceSessionRequest request) {

        if (request == null) {
            throw badRequest("Request body is required.");
        }

        LocalDate date = request.getDate() == null ? LocalDate.now() : request.getDate();
        validateDate(date);

        String subject = requireText(request.getSubject(), "Subject", 100);
        String topic = requireText(request.getTopic(), "Topic", 180);

        List<AttendanceSessionRequest.StudentAttendanceItem> items = request.getAttendance();
        if (items == null || items.isEmpty()) {
            throw badRequest("Attendance must contain at least one student.");
        }

        Set<Long> ids = new HashSet<>();
        for (var item : items) {
            if (item == null || item.getStudentId() == null) {
                throw badRequest("Every attendance item must include a studentId.");
            }
            if (!ids.add(item.getStudentId())) {
                throw badRequest("A student may appear only once in a submission.");
            }
            validateStatus(item.getStatus());
        }

        // Validate the complete request before writing any rows.
        Map<Long, Student> activeStudents = studentRepository.findAllById(ids)
                .stream()
                .filter(Student::isActive)
                .collect(Collectors.toMap(Student::getId, student -> student));

        if (activeStudents.size() != ids.size()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "One or more students do not exist or are inactive.");
        }

        for (Long studentId : ids) {
            if (attendanceRepository.existsByStudent_IdAndAttendanceDateAndSubjectAndTopic(
                    studentId, date, subject, topic)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Attendance already exists for at least one student in this subject/topic session.");
            }
        }

        int present = 0;
        int absent = 0;
        List<AttendanceRecord> records = new ArrayList<>();

        for (var item : items) {
            String status = normalizeStatus(item.getStatus());
            AttendanceRecord record = new AttendanceRecord();
            record.setStudent(activeStudents.get(item.getStudentId()));
            record.setAttendanceDate(date);
            record.setSubject(subject);
            record.setTopic(topic);
            record.setStatus(status);
            records.add(record);

            if ("PRESENT".equals(status)) {
                present++;
            } else {
                absent++;
            }
        }

        try {
            attendanceRepository.saveAllAndFlush(records);
        } catch (DataIntegrityViolationException ex) {
            // Runtime exception causes transaction rollback.
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Attendance conflicts with an existing record. No changes were committed.");
        }

        return new AttendanceSessionResponse(date, subject, topic, present, absent, records.size());
    }

    /**
     * Legacy endpoint retained for compatibility with existing clients.
     * New frontend should use POST /api/attendance/session.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public AttendanceRecord markAttendance(
            @RequestParam Long studentId,
            @RequestParam String status,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date,
            @RequestParam(required = false, defaultValue = "General") String subject,
            @RequestParam(required = false, defaultValue = "General") String topic) {

        Student student = studentRepository.findById(studentId)
                .filter(Student::isActive)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Active student not found"));

        String normalizedStatus = normalizeStatus(status);
        LocalDate attendanceDate = date != null ? date : LocalDate.now();
        validateDate(attendanceDate);
        String normalizedSubject = requireText(subject, "Subject", 100);
        String normalizedTopic = requireText(topic, "Topic", 180);

        if (attendanceRepository.existsByStudent_IdAndAttendanceDateAndSubjectAndTopic(
                studentId, attendanceDate, normalizedSubject, normalizedTopic)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Attendance already marked for this student and session.");
        }

        AttendanceRecord record = new AttendanceRecord();
        record.setStudent(student);
        record.setAttendanceDate(attendanceDate);
        record.setSubject(normalizedSubject);
        record.setTopic(normalizedTopic);
        record.setStatus(normalizedStatus);

        try {
            return attendanceRepository.saveAndFlush(record);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Attendance already exists for this student and session.");
        }
    }

    @GetMapping
    public List<AttendanceRecord> getAttendance(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        List<AttendanceRecord> records = date == null
                ? attendanceRepository.findAll()
                : attendanceRepository.findByAttendanceDate(date);

        if (date != null) {
            validateDate(date);
        }

        return records.stream()
                .filter(record -> record.getStudent() != null)
                .filter(record -> record.getStudent().isActive())
                .toList();
    }

    @PutMapping("/{id}")
    public AttendanceRecord updateAttendance(
            @PathVariable Long id,
            @RequestParam String status) {

        validateStatus(status);

        AttendanceRecord record = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Attendance record not found"));

        throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Attendance has already been marked as " + record.getStatus()
                        + ". The status cannot be changed.");
    }

    @GetMapping("/reports")
    public List<Map<String, Object>> getAttendanceReports() {
        List<Student> students = studentRepository.findByActiveTrue();

        return students.stream().map(student -> {
            long totalDays = attendanceRepository.countMarkedDays(student.getId());
            long presentDays = attendanceRepository.countPresentDays(student.getId());
            long absentDays = attendanceRepository.countAbsentDays(student.getId());

            double percentage = totalDays == 0
                    ? 0.0
                    : Math.round((presentDays * 10000.0) / totalDays) / 100.0;

            Map<String, Object> report = new LinkedHashMap<>();
            report.put("studentId", student.getId());
            report.put("name", student.getName());
            report.put("rollNumber", student.getRollNumber());
            report.put("department", student.getDepartment());
            report.put("year", student.getYear());
            report.put("totalDays", totalDays);
            report.put("presentDays", presentDays);
            report.put("absentDays", absentDays);
            report.put("attendancePercentage", percentage);
            return report;
        }).toList();
    }

    private String requireText(String value, String label, int maxLength) {
        if (value == null || value.isBlank()) {
            throw badRequest(label + " is required.");
        }
        String trimmed = value.trim();
        if (trimmed.length() > maxLength) {
            throw badRequest(label + " must be " + maxLength + " characters or fewer.");
        }
        return trimmed;
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            throw badRequest("Status is required. Use PRESENT or ABSENT.");
        }
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        if (!normalized.equals("PRESENT") && !normalized.equals("ABSENT")) {
            throw badRequest("Status must be PRESENT or ABSENT.");
        }
        return normalized;
    }

    private void validateStatus(String status) {
        normalizeStatus(status);
    }

    private void validateDate(LocalDate date) {
        if (date.isAfter(LocalDate.now())) {
            throw badRequest("Attendance date cannot be in the future.");
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
