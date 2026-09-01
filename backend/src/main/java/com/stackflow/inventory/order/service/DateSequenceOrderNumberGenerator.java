package com.stackflow.inventory.order.service;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * {@code ORD-yyyyMMdd-XXXX}: sortable by eye, unique enough for a single deployment, and cheap —
 * no extra sequence table on the write path. Uniqueness is still enforced by a database constraint,
 * and the service retries on the (very rare) collision.
 */
@Component
@RequiredArgsConstructor
public class DateSequenceOrderNumberGenerator implements OrderNumberGenerator {

    private static final DateTimeFormatter DATE_PART = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final String ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final int SUFFIX_LENGTH = 4;

    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    @Override
    public String next() {
        StringBuilder suffix = new StringBuilder(SUFFIX_LENGTH);
        for (int i = 0; i < SUFFIX_LENGTH; i++) {
            suffix.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return "ORD-%s-%s".formatted(LocalDate.now(clock).format(DATE_PART), suffix);
    }
}
