package com.college.attendance.attendancerecord;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long> {

    List<AttendanceRecord> findByAttendanceDate(LocalDate attendanceDate);

    boolean existsByStudent_IdAndAttendanceDateAndSubjectAndTopic(
            Long studentId,
            LocalDate attendanceDate,
            String subject,
            String topic);

    boolean existsByStudent_IdAndAttendanceDate(
            Long studentId,
            LocalDate attendanceDate);

    boolean existsByStudent_Id(Long studentId);

    @Modifying
    @Query("""
        DELETE FROM AttendanceRecord a
        WHERE a.student.id = :studentId
        """)
    int deleteByStudentId(@Param("studentId") Long studentId);

    @Query("""
        SELECT COUNT(a)
        FROM AttendanceRecord a
        WHERE a.student.id = :studentId
        """)
    long countMarkedDays(@Param("studentId") Long studentId);

    @Query("""
        SELECT COUNT(a)
        FROM AttendanceRecord a
        WHERE a.student.id = :studentId
          AND a.status = 'PRESENT'
        """)
    long countPresentDays(@Param("studentId") Long studentId);

    @Query("""
        SELECT COUNT(a)
        FROM AttendanceRecord a
        WHERE a.student.id = :studentId
          AND a.status = 'ABSENT'
        """)
    long countAbsentDays(@Param("studentId") Long studentId);
}
