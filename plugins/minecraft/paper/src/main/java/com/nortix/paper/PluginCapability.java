package com.nortix.paper;

import java.util.Arrays;
import java.util.List;

final class PluginCapability {
    final String id;
    final String provider;
    final String category;
    final String version;
    final List<String> metrics;
    final String placeholder;

    PluginCapability(String id, String provider, String category, String version, String placeholder, String... metrics) {
        this.id = id;
        this.provider = provider;
        this.category = category;
        this.version = version == null ? "" : version;
        this.placeholder = placeholder;
        this.metrics = Arrays.asList(metrics);
    }

    String toJson() {
        return "{\"id\":\"" + MilestoneReporter.json(id) + "\",\"provider\":\""
            + MilestoneReporter.json(provider) + "\",\"category\":\"" + category
            + "\",\"metrics\":" + MilestoneReporter.jsonArray(metrics) + ",\"version\":\""
            + MilestoneReporter.json(version) + "\",\"available\":true}";
    }
}
