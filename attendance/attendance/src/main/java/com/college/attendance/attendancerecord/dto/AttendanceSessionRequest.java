package com.college.attendance.attendancerecord.dto;

import java.time.LocalDate;
import java.util.List;

public class AttendanceSessionRequest {

    private LocalDate date;
    private String subject;
    private String topic;
    private List<StudentAttendanceItem> attendance;

    public AttendanceSessionRequest() {
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public List<StudentAttendanceItem> getAttendance() {
        return attendance;
    }

    public void setAttendance(List<StudentAttendanceItem> attendance) {
        this.attendance = attendance;
    }

    public static class StudentAttendanceItem {
        private Long studentId;
        private String status;

        public StudentAttendanceItem() {
        }

        public Long getStudentId() {
            return studentId;
        }

        public void setStudentId(Long studentId) {
            this.studentId = studentId;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }
    }
}
