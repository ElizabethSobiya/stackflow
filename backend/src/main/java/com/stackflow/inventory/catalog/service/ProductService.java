package com.stackflow.inventory.catalog.service;

import com.stackflow.inventory.catalog.domain.Product;
import com.stackflow.inventory.catalog.dto.ProductRequest;
import com.stackflow.inventory.catalog.dto.ProductResponse;
import com.stackflow.inventory.catalog.dto.ProductSearchCriteria;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ProductService {

    ProductResponse create(ProductRequest request);

    ProductResponse update(Long id, ProductRequest request);

    ProductResponse getById(Long id);

    /** Search results are enriched with current stock levels in a single extra query. */
    Page<ProductResponse> search(ProductSearchCriteria criteria, Pageable pageable);

    void deactivate(Long id);

    void activate(Long id);

    List<String> listCategories();

    long countActive();

    /** Entity access for other features that need the aggregate itself (orders pricing lines). */
    Product getEntity(Long id);

    Map<Long, Product> getEntities(Collection<Long> ids);
}
