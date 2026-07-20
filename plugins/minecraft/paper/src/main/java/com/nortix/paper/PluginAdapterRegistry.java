package com.nortix.paper;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.bukkit.OfflinePlayer;
import org.bukkit.entity.Player;
import org.bukkit.plugin.Plugin;

final class PluginAdapterRegistry {
    private final NortixPaperPlugin plugin;
    private final List<PluginCapability> capabilities = new ArrayList<>();

    PluginAdapterRegistry(NortixPaperPlugin plugin) {
        this.plugin = plugin;
        capabilities.add(new PluginCapability("paper-core", "Paper", "CORE", plugin.getServer().getVersion(), null,
            "PLAYER_KILLS", "UNIQUE_PLAYER_KILLS", "MOB_KILLS", "BLOCKS_BROKEN", "PLAYTIME_SECONDS", "PVP_STREAK"));
        detect("bentobox-level", "BentoBox + Level", "SKYBLOCK", "%Level_bskyblock_island_level%", new String[] {"SKYBLOCK_LEVEL"}, new String[] {"BentoBox", "Level"});
        detect("superior-skyblock-2", "SuperiorSkyblock2", "SKYBLOCK", "%superior_island_level%", new String[] {"SKYBLOCK_LEVEL"}, new String[] {"SuperiorSkyblock2"});
        detect("iridium-skyblock", "IridiumSkyblock", "SKYBLOCK", "%iridiumskyblock_island_value%", new String[] {"ISLAND_WORTH"}, new String[] {"IridiumSkyblock"});
        detect("askyblock", "ASkyBlock", "SKYBLOCK", "%askyblock_island_level%", new String[] {"SKYBLOCK_LEVEL"}, new String[] {"ASkyBlock"});
        detect("uskyblock", "uSkyBlock", "SKYBLOCK", "%uskyblock_island_level%", new String[] {"SKYBLOCK_LEVEL"}, new String[] {"uSkyBlock"});
        detect("lifestealz", "LifeStealZ", "LIFESTEAL", "%lifestealz_hearts%", new String[] {"LIFESTEAL_HEARTS"}, new String[] {"LifeStealZ"});
        detect("lifesteal-core", "LifestealCore", "LIFESTEAL", "%lifesteal_hearts%", new String[] {"LIFESTEAL_HEARTS"}, new String[] {"LifestealCore", "LifeSteal"});
        detect("combatlogx", "CombatLogX", "PVP", null, new String[] {"PLAYER_KILLS", "UNIQUE_PLAYER_KILLS", "PVP_STREAK"}, new String[] {"CombatLogX"});
        detect("pvpmanager", "PvPManager", "PVP", null, new String[] {"PLAYER_KILLS", "UNIQUE_PLAYER_KILLS", "PVP_STREAK"}, new String[] {"PvPManager"});
        detect("mcmmo", "mcMMO", "SKILLS", "%mcmmo_power_level%", new String[] {"SKILL_LEVEL"}, new String[] {"mcMMO"});
    }

    private void detect(String id, String provider, String category, String placeholder, String[] metrics, String[] pluginNames) {
        Plugin detected = null;
        for (String name : pluginNames) {
            detected = plugin.getServer().getPluginManager().getPlugin(name);
            if (detected != null && detected.isEnabled()) break;
        }
        if (detected != null) {
            String configuredPlaceholder = plugin.getConfig().getString("adapter-placeholders." + id, placeholder);
            capabilities.add(new PluginCapability(id, provider, category, detected.getDescription().getVersion(), configuredPlaceholder, metrics));
        }
    }

    List<PluginCapability> capabilities() {
        return Collections.unmodifiableList(capabilities);
    }

    List<MetricReading> readMetrics(Player player) {
        if (plugin.getServer().getPluginManager().getPlugin("PlaceholderAPI") == null) return Collections.emptyList();
        List<MetricReading> readings = new ArrayList<>();
        for (PluginCapability capability : capabilities) {
            if (capability.placeholder == null || capability.metrics.isEmpty()) continue;
            String rendered = parsePlaceholder(player, capability.placeholder);
            double value = parseNumber(rendered);
            if (!Double.isNaN(value)) readings.add(new MetricReading(capability.metrics.get(0), value, capability.provider));
        }
        return readings;
    }

    private String parsePlaceholder(Player player, String placeholder) {
        try {
            Class<?> api = Class.forName("me.clip.placeholderapi.PlaceholderAPI");
            Method method = api.getMethod("setPlaceholders", OfflinePlayer.class, String.class);
            return String.valueOf(method.invoke(null, player, placeholder));
        } catch (ReflectiveOperationException error) {
            return "";
        }
    }

    private static double parseNumber(String input) {
        if (input == null) return Double.NaN;
        String normalized = input.replaceAll("[^0-9.\\-]", "");
        if (normalized.isEmpty() || normalized.equals("-")) return Double.NaN;
        try { return Double.parseDouble(normalized); }
        catch (NumberFormatException ignored) { return Double.NaN; }
    }

    static final class MetricReading {
        final String metric;
        final double value;
        final String provider;

        MetricReading(String metric, double value, String provider) {
            this.metric = metric;
            this.value = value;
            this.provider = provider;
        }
    }
}
