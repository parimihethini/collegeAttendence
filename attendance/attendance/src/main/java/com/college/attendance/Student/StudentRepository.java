
package com.college.attendance.Student;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StudentRepository
        extends JpaRepository<Student, Long> {

    boolean existsByRollNumber(String rollNumber);

    List<Student> findByActiveTrue();

    boolean existsByRollNumberAndActiveTrue(String rollNumber);
}
