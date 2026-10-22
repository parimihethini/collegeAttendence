package com.college.attendance.attendancerecord.dto;

import java.time.LocalDate;

public class AttendanceSessionResponse {

    private final LocalDate date;
    private final String subject;
    private final String topic;
    private final int present;
    private final int absent;
    private final int saved;

    public AttendanceSessionResponse(
            LocalDate date,
            String subject,
            String topic,
            int present,
            int absent,
            int saved) {
        this.date = date;
        this.subject = subject;
        this.topic = topic;
        this.present = present;
        this.absent = absent;
        this.saved = saved;
    }

    public LocalDate getDate() {
        return date;
    }

    public String getSubject() {
        return subject;
    }

    public String getTopic() {
        return topic;
    }

    public int getPresent() {
        return present;
    }

    public int getAbsent() {
        return absent;
    }

    public int getSaved() {
        return saved;
    }
}
