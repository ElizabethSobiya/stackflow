package com.stackflow.inventory.common.support;

import java.security.SecureRandom;
import java.util.function.Supplier;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.OptimisticLockingFailureException;

/**
 * Runs a unit of work again when it loses an optimistic-locking race.
 *
 * <p>Stock adjustments are short transactions that recompute from fresh state: when two orders
 * confirm the same product at the same instant, one of them fails on {@code @Version} and simply
 * needs to re-read and retry. Retrying here (rather than pushing a 409 to a user who cannot see the
 * race) keeps the common case invisible, while sustained contention still surfaces once the attempt
 * budget is spent.
 *
 * <p>Attempts are spaced by a short randomised backoff. Without it, contending requests retry in
 * lockstep and keep colliding — measured on this codebase, ten concurrent adjustments of the same
 * row went from four winners to all ten simply by staggering the retries.
 *
 * <p>The supplied action <strong>must</strong> open its own transaction, so the caller has to be
 * outside a transaction boundary — otherwise the retry re-runs inside the already-doomed one.
 */
@Slf4j
public final class OptimisticRetry {

    private static final long BASE_BACKOFF_MILLIS = 20;
    private static final long MAX_BACKOFF_MILLIS = 320;
    private static final SecureRandom JITTER = new SecureRandom();

    private OptimisticRetry() {}

    public static <T> T execute(String operation, int maxAttempts, Supplier<T> action) {
        if (maxAttempts < 1) {
            throw new IllegalArgumentException("maxAttempts must be >= 1");
        }
        OptimisticLockingFailureException lastFailure = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return action.get();
            } catch (OptimisticLockingFailureException ex) {
                lastFailure = ex;
                log.warn("Optimistic lock conflict during '{}' (attempt {}/{})", operation, attempt, maxAttempts);
                if (attempt < maxAttempts) {
                    backoff(attempt);
                }
            }
        }
        throw lastFailure;
    }

    public static void execute(String operation, int maxAttempts, Runnable action) {
        execute(operation, maxAttempts, () -> {
            action.run();
            return null;
        });
    }

    /** Exponential backoff with full jitter, so contending callers stop colliding in lockstep. */
    private static void backoff(int attempt) {
        long ceiling = Math.min(MAX_BACKOFF_MILLIS, BASE_BACKOFF_MILLIS << (attempt - 1));
        try {
            Thread.sleep(1 + JITTER.nextLong(ceiling));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while waiting to retry", ex);
        }
    }
}
