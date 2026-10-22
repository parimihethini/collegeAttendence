
package com.college.attendance.security;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AppUserDetailsService implements UserDetailsService {

    private final AppUserRepository repository;

    public AppUserDetailsService(AppUserRepository repository) {
        this.repository = repository;
    }

    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {

        AppUser appUser = repository.findByUsername(username)
            .orElseThrow(() ->
                new UsernameNotFoundException("Invalid username or password")
            );

        return new User(
            appUser.getUsername(),
            appUser.getPassword(),
            List.of(new SimpleGrantedAuthority("ROLE_" + appUser.getRole()))
        );
    }
}
