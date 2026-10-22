package com.college.attendance.attendance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    List<Attendance> findByAttendanceDateAndSubjectAndClassName(
            LocalDate attendanceDate,
            String subject,
            String className
    );

    List<Attendance> findByStudentId(Long studentId);

    List<Attendance> findByStudentIdAndSubject(
            Long studentId,
            String subject
    );
}
