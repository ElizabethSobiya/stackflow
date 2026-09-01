package com.stackflow.inventory.common.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.dao.OptimisticLockingFailureException;

class OptimisticRetryTest {

    @Test
    void returnsImmediatelyWhenThereIsNoConflict() {
        AtomicInteger calls = new AtomicInteger();

        String result = OptimisticRetry.execute("op", 3, () -> {
            calls.incrementAndGet();
            return "done";
        });

        assertThat(result).isEqualTo("done");
        assertThat(calls).hasValue(1);
    }

    @Test
    void retriesUntilTheWriteWins() {
        AtomicInteger calls = new AtomicInteger();

        String result = OptimisticRetry.execute("op", 3, () -> {
            if (calls.incrementAndGet() < 3) {
                throw new OptimisticLockingFailureException("conflict");
            }
            return "done";
        });

        assertThat(result).isEqualTo("done");
        assertThat(calls).hasValue(3);
    }

    @Test
    void surfacesTheConflictOnceTheBudgetIsSpent() {
        AtomicInteger calls = new AtomicInteger();

        assertThatThrownBy(() -> OptimisticRetry.execute("op", 2, () -> {
                    calls.incrementAndGet();
                    throw new OptimisticLockingFailureException("conflict");
                }))
                .isInstanceOf(OptimisticLockingFailureException.class);

        assertThat(calls).hasValue(2);
    }

    @Test
    void otherFailuresAreNotRetried() {
        AtomicInteger calls = new AtomicInteger();

        assertThatThrownBy(() -> OptimisticRetry.execute("op", 3, () -> {
                    calls.incrementAndGet();
                    throw new IllegalStateException("boom");
                }))
                .isInstanceOf(IllegalStateException.class);

        assertThat(calls).hasValue(1);
    }
}
