package com.stackflow.inventory.catalog.service;

import com.stackflow.inventory.catalog.domain.Product;
import com.stackflow.inventory.catalog.dto.ProductRequest;
import com.stackflow.inventory.catalog.dto.ProductResponse;
import com.stackflow.inventory.catalog.dto.ProductSearchCriteria;
import com.stackflow.inventory.catalog.repository.ProductRepository;
import com.stackflow.inventory.catalog.repository.ProductSpecifications;
import com.stackflow.inventory.common.exception.ConflictException;
import com.stackflow.inventory.common.exception.ResourceNotFoundException;
import com.stackflow.inventory.common.support.Specifications;
import com.stackflow.inventory.stock.service.StockService;
import com.stackflow.inventory.stock.service.StockView;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final StockService stockService;

    @Override
    @Transactional
    public ProductResponse create(ProductRequest request) {
        String sku = request.sku().trim().toUpperCase();
        if (productRepository.existsBySkuIgnoreCase(sku)) {
            throw new ConflictException("A product with SKU %s already exists".formatted(sku));
        }
        Product product = productRepository.save(Product.builder()
                .name(request.name().trim())
                .description(request.description())
                .category(request.category().trim())
                .sku(sku)
                .price(request.price())
                .build());

        // A product without a stock row would break every stock lookup, so the two are created together.
        stockService.initialiseFor(
                product,
                request.initialQuantity() != null ? request.initialQuantity() : 0,
                request.lowStockThreshold());

        log.info("Created product {} ({})", product.getId(), sku);
        return withStock(product);
    }

    @Override
    @Transactional
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = getEntity(id);
        String sku = request.sku().trim().toUpperCase();
        if (!product.getSku().equalsIgnoreCase(sku) && productRepository.existsBySkuIgnoreCase(sku)) {
            throw new ConflictException("A product with SKU %s already exists".formatted(sku));
        }
        product.update(request.name().trim(), request.description(), request.category().trim(), request.price());
        product.changeSku(sku);
        if (request.lowStockThreshold() != null) {
            stockService.changeThreshold(id, request.lowStockThreshold());
        }
        return withStock(product);
    }

    @Override
    public ProductResponse getById(Long id) {
        return withStock(getEntity(id));
    }

    @Override
    public Page<ProductResponse> search(ProductSearchCriteria criteria, Pageable pageable) {
        Specification<Product> specification = Specifications.allOf(
                ProductSpecifications.matchesText(criteria.search()),
                ProductSpecifications.hasCategory(criteria.category()),
                ProductSpecifications.isActive(criteria.active()),
                ProductSpecifications.priceAtLeast(criteria.minPrice()),
                ProductSpecifications.priceAtMost(criteria.maxPrice()));

        Page<Product> page = productRepository.findAll(specification, pageable);
        Map<Long, StockView> stockByProduct =
                stockService.getByProductIds(page.getContent().stream().map(Product::getId).toList());

        return page.map(product -> toResponse(product, stockByProduct.get(product.getId())));
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        getEntity(id).deactivate();
    }

    @Override
    @Transactional
    public void activate(Long id) {
        getEntity(id).activate();
    }

    @Override
    public List<String> listCategories() {
        return productRepository.findDistinctCategories();
    }

    @Override
    public long countActive() {
        return productRepository.countByActiveTrue();
    }

    @Override
    public Product getEntity(Long id) {
        return productRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Product", id));
    }

    @Override
    public Map<Long, Product> getEntities(Collection<Long> ids) {
        return productRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
    }

    private ProductResponse withStock(Product product) {
        return toResponse(product, stockService.getByProductIds(List.of(product.getId())).get(product.getId()));
    }

    private ProductResponse toResponse(Product product, StockView stock) {
        return stock == null
                ? ProductResponse.from(product)
                : ProductResponse.from(product, stock.quantity(), stock.lowStockThreshold(), stock.lowStock());
    }
}
