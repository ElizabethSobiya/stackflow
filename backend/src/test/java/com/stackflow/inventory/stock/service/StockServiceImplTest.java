package com.stackflow.inventory.stock.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.stackflow.inventory.catalog.domain.Product;
import com.stackflow.inventory.common.exception.ResourceNotFoundException;
import com.stackflow.inventory.stock.config.StockProperties;
import com.stackflow.inventory.stock.domain.InsufficientStockException;
import com.stackflow.inventory.stock.domain.StockItem;
import com.stackflow.inventory.stock.domain.StockMovement;
import com.stackflow.inventory.stock.domain.StockMovementReason;
import com.stackflow.inventory.stock.repository.StockItemRepository;
import com.stackflow.inventory.stock.repository.StockMovementRepository;
import com.stackflow.inventory.support.TransactionTemplates;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class StockServiceImplTest {

    @Mock
    private StockItemRepository stockItemRepository;

    @Mock
    private StockMovementRepository stockMovementRepository;

    private StockServiceImpl stockService;

    @BeforeEach
    void setUp() {
        stockService = new StockServiceImpl(
                stockItemRepository,
                stockMovementRepository,
                new StockProperties(10, 3),
                TransactionTemplates.passthrough());
    }

    @Test
    void adjustAppliesTheDeltaAndRecordsTheReason() {
        StockItem item = stockItem(1L, 20, 5);
        when(stockItemRepository.findByProductId(1L)).thenReturn(Optional.of(item));

        StockView view = stockService.adjust(1L, -4, StockMovementReason.DAMAGE_WRITE_OFF, "water damage", null);

        assertThat(view.quantity()).isEqualTo(16);
        ArgumentCaptor<StockMovement> captor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(captor.capture());
        assertThat(captor.getValue().getDelta()).isEqualTo(-4);
        assertThat(captor.getValue().getResultingQuantity()).isEqualTo(16);
        assertThat(captor.getValue().getReason()).isEqualTo(StockMovementReason.DAMAGE_WRITE_OFF);
    }

    @Test
    void unknownProductsHaveNoStock() {
        when(stockItemRepository.findByProductId(42L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> stockService.getByProductId(42L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("an order deducts every line and logs one movement per line")
    void deductForOrderAppliesAllLines() {
        StockItem first = stockItem(1L, 10, 2);
        StockItem second = stockItem(2L, 8, 2);
        when(stockItemRepository.findByProductId(1L)).thenReturn(Optional.of(first));
        when(stockItemRepository.findByProductId(2L)).thenReturn(Optional.of(second));

        stockService.deductForOrder(77L, List.of(new StockLine(1L, 3), new StockLine(2L, 8)));

        assertThat(first.getQuantity()).isEqualTo(7);
        assertThat(second.getQuantity()).isZero();
        verify(stockMovementRepository, times(2)).save(any(StockMovement.class));
    }

    @Test
    void deductingMoreThanAvailableIsRefused() {
        StockItem item = stockItem(1L, 2, 1);
        when(stockItemRepository.findByProductId(1L)).thenReturn(Optional.of(item));

        assertThatThrownBy(() -> stockService.deductForOrder(77L, List.of(new StockLine(1L, 5))))
                .isInstanceOf(InsufficientStockException.class);
    }

    @Test
    @DisplayName("a lost optimistic-locking race is retried against fresh state")
    void retriesOnConcurrentModification() {
        AtomicInteger reads = new AtomicInteger();
        StockItem item = stockItem(1L, 10, 2);
        when(stockItemRepository.findByProductId(1L)).thenAnswer(invocation -> {
            // First read simulates another transaction committing first.
            if (reads.incrementAndGet() == 1) {
                throw new OptimisticLockingFailureException("version conflict");
            }
            return Optional.of(item);
        });

        StockView view = stockService.adjust(1L, -1, StockMovementReason.MANUAL_ADJUSTMENT, null, null);

        assertThat(view.quantity()).isEqualTo(9);
        assertThat(reads).hasValue(2);
    }

    @Test
    void restoringPutsUnitsBack() {
        StockItem item = stockItem(1L, 4, 2);
        when(stockItemRepository.findByProductId(1L)).thenReturn(Optional.of(item));

        stockService.restoreForOrder(77L, List.of(new StockLine(1L, 6)));

        assertThat(item.getQuantity()).isEqualTo(10);
    }

    private static StockItem stockItem(Long productId, int quantity, int threshold) {
        Product product = Product.builder()
                .name("Widget " + productId)
                .category("Test")
                .sku("SKU-" + productId)
                .price(new BigDecimal("10.00"))
                .build();
        ReflectionTestUtils.setField(product, "id", productId);
        return StockItem.builder()
                .product(product)
                .quantity(quantity)
                .lowStockThreshold(threshold)
                .build();
    }
}
