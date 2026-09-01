package com.stackflow.inventory.catalog.web;

import com.stackflow.inventory.catalog.dto.ProductRequest;
import com.stackflow.inventory.catalog.dto.ProductResponse;
import com.stackflow.inventory.catalog.dto.ProductSearchCriteria;
import com.stackflow.inventory.catalog.service.ProductService;
import com.stackflow.inventory.common.api.PageResponse;
import com.stackflow.inventory.security.Roles;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Reads are open to any authenticated user; writes are admin-only. Pagination, sorting and
 * filtering all happen in the database — the client never receives more rows than it asked for.
 */
@Tag(name = "Products", description = "Product catalog")
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    @Operation(summary = "Search the catalog with server-side pagination and filtering")
    public PageResponse<ProductResponse> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        var criteria = new ProductSearchCriteria(search, category, active, minPrice, maxPrice);
        return PageResponse.of(productService.search(criteria, pageable));
    }

    @GetMapping("/categories")
    public List<String> categories() {
        return productService.listCategories();
    }

    @GetMapping("/{id}")
    public ProductResponse get(@PathVariable Long id) {
        return productService.getById(id);
    }

    @PostMapping
    @PreAuthorize(Roles.HAS_ADMIN)
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse create(@Valid @RequestBody ProductRequest request) {
        return productService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize(Roles.HAS_ADMIN)
    public ProductResponse update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return productService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(Roles.HAS_ADMIN)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Soft-delete: the product is deactivated, keeping order history intact")
    public void deactivate(@PathVariable Long id) {
        productService.deactivate(id);
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize(Roles.HAS_ADMIN)
    public ProductResponse activate(@PathVariable Long id) {
        productService.activate(id);
        return productService.getById(id);
    }
}
