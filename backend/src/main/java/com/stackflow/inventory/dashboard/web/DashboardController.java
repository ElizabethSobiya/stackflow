package com.stackflow.inventory.dashboard.web;

import com.stackflow.inventory.dashboard.dto.DashboardSummaryResponse;
import com.stackflow.inventory.dashboard.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Dashboard")
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    @Operation(summary = "Headline metrics, a 7-day revenue series and the most recent orders")
    public DashboardSummaryResponse summary() {
        return dashboardService.summary();
    }
}
