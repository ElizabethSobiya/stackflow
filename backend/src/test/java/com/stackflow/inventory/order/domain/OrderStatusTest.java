package com.stackflow.inventory.order.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;

class OrderStatusTest {

    @ParameterizedTest(name = "{0} -> {1} is allowed")
    @MethodSource("legalTransitions")
    void allowsForwardTransitions(OrderStatus from, OrderStatus to) {
        assertThat(from.canTransitionTo(to)).isTrue();
    }

    @ParameterizedTest(name = "{0} -> {1} is rejected")
    @MethodSource("illegalTransitions")
    void rejectsEverythingElse(OrderStatus from, OrderStatus to) {
        assertThat(from.canTransitionTo(to)).isFalse();
    }

    @ParameterizedTest
    @EnumSource(OrderStatus.class)
    void neverAllowsSelfTransition(OrderStatus status) {
        assertThat(status.canTransitionTo(status)).isFalse();
    }

    @Test
    @DisplayName("delivered and cancelled are terminal")
    void terminalStates() {
        assertThat(OrderStatus.DELIVERED.isTerminal()).isTrue();
        assertThat(OrderStatus.CANCELLED.isTerminal()).isTrue();
        assertThat(OrderStatus.PENDING.isTerminal()).isFalse();
    }

    @Test
    void onlyConfirmedAndShippedHoldStock() {
        assertThat(OrderStatus.CONFIRMED.holdsStock()).isTrue();
        assertThat(OrderStatus.SHIPPED.holdsStock()).isTrue();
        assertThat(OrderStatus.PENDING.holdsStock()).isFalse();
        assertThat(OrderStatus.DELIVERED.holdsStock()).isFalse();
        assertThat(OrderStatus.CANCELLED.holdsStock()).isFalse();
    }

    @Test
    void revenueIsRecognisedFromConfirmationOnwards() {
        assertThat(OrderStatus.CONFIRMED.countsAsRevenue()).isTrue();
        assertThat(OrderStatus.DELIVERED.countsAsRevenue()).isTrue();
        assertThat(OrderStatus.PENDING.countsAsRevenue()).isFalse();
        assertThat(OrderStatus.CANCELLED.countsAsRevenue()).isFalse();
    }

    static Stream<Arguments> legalTransitions() {
        return Stream.of(
                Arguments.of(OrderStatus.PENDING, OrderStatus.CONFIRMED),
                Arguments.of(OrderStatus.PENDING, OrderStatus.CANCELLED),
                Arguments.of(OrderStatus.CONFIRMED, OrderStatus.SHIPPED),
                Arguments.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED),
                Arguments.of(OrderStatus.SHIPPED, OrderStatus.DELIVERED));
    }

    static Stream<Arguments> illegalTransitions() {
        return Stream.of(
                Arguments.of(OrderStatus.PENDING, OrderStatus.SHIPPED),
                Arguments.of(OrderStatus.PENDING, OrderStatus.DELIVERED),
                Arguments.of(OrderStatus.CONFIRMED, OrderStatus.DELIVERED),
                Arguments.of(OrderStatus.SHIPPED, OrderStatus.CANCELLED),
                Arguments.of(OrderStatus.SHIPPED, OrderStatus.CONFIRMED),
                Arguments.of(OrderStatus.DELIVERED, OrderStatus.PENDING),
                Arguments.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED),
                Arguments.of(OrderStatus.CANCELLED, OrderStatus.PENDING),
                Arguments.of(OrderStatus.CANCELLED, OrderStatus.CONFIRMED));
    }
}
