package com.stackflow.inventory.order.service;

/** Produces the human-facing order reference (e.g. {@code ORD-20260901-7F3A}). */
public interface OrderNumberGenerator {

    String next();
}
