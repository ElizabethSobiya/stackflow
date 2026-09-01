package com.stackflow.inventory.catalog.repository;

import com.stackflow.inventory.catalog.domain.Product;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    boolean existsBySkuIgnoreCase(String sku);

    @Query("select distinct p.category from Product p where p.active = true order by p.category")
    List<String> findDistinctCategories();

    long countByActiveTrue();
}
