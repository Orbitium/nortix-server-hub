package com.nortix.paper;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.stream.Collectors;
import org.bukkit.entity.EntityType;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.entity.EntityDeathEvent;
import org.bukkit.event.entity.PlayerDeathEvent;
import org.bukkit.scheduler.BukkitTask;

final class MilestoneReporter implements Listener {
    private final NortixPaperPlugin plugin;
    private final PluginAdapterRegistry adapters;
    private final ConcurrentLinkedQueue<String> queue = new ConcurrentLinkedQueue<>();
    private final Map<UUID, Integer> killStreaks = new ConcurrentHashMap<>();
    private final String instanceId = UUID.randomUUID().toString();
    private volatile String serverId;
    private volatile String serverToken;
    private volatile String proxyServerName;
    private BukkitTask flushTask;
    private BukkitTask metricTask;
    private BukkitTask capabilityTask;

    MilestoneReporter(NortixPaperPlugin plugin) {
        this.plugin = plugin;
        this.adapters = new PluginAdapterRegistry(plugin);
        reloadConnection();
    }

    void start() {
        plugin.getServer().getPluginManager().registerEvents(this, plugin);
        flushTask = plugin.getServer().getScheduler().runTaskTimerAsynchronously(plugin, this::flush, 40L, 40L);
        long interval = Math.max(15L, plugin.getConfig().getLong("metric-poll-seconds", 30L));
        metricTask = plugin.getServer().getScheduler().runTaskTimer(plugin, () -> pollMetrics(interval), interval * 20L, interval * 20L);
        capabilityTask = plugin.getServer().getScheduler().runTaskTimerAsynchronously(plugin, this::publishCapabilities, 80L, 20L * 300L);
    }

    void stop() {
        if (flushTask != null) flushTask.cancel();
        if (metricTask != null) metricTask.cancel();
        if (capabilityTask != null) capabilityTask.cancel();
        flush();
    }

    void reloadConnection() {
        serverId = plugin.getConfig().getString("server-id", "").trim();
        serverToken = plugin.getConfig().getString("server-token", "").trim();
        proxyServerName = plugin.getConfig().getString("proxy-server-name", "").trim();
        if (isConnected()) publishCapabilities();
    }

    boolean isConnected() {
        return !serverId.isEmpty() && serverToken.startsWith("npx_");
    }

    String getServerId() {
        return serverId;
    }

    List<PluginCapability> getCapabilities() {
        return adapters.capabilities();
    }

    String capabilitySummary() {
        return adapters.capabilities().stream().map(item -> item.provider).collect(Collectors.joining(", "));
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onPlayerDeath(PlayerDeathEvent event) {
        Player victim = event.getEntity();
        killStreaks.remove(victim.getUniqueId());
        Player killer = victim.getKiller();
        if (killer == null || killer.getUniqueId().equals(victim.getUniqueId())) return;
        int streak = killStreaks.merge(killer.getUniqueId(), 1, Integer::sum);
        enqueue(killer, "PLAYER_KILL", "{\"victimUuid\":\"" + victim.getUniqueId()
            + "\",\"victimName\":\"" + json(victim.getName()) + "\",\"streak\":" + streak + "}");
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onEntityDeath(EntityDeathEvent event) {
        if (event.getEntityType() == EntityType.PLAYER) return;
        Player killer = event.getEntity().getKiller();
        if (killer == null) return;
        enqueue(killer, "MOB_KILL", "{\"entityType\":\"" + event.getEntityType().name() + "\"}");
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onBlockBreak(BlockBreakEvent event) {
        enqueue(event.getPlayer(), "BLOCK_BREAK", "{\"material\":\"" + event.getBlock().getType().name()
            + "\",\"world\":\"" + json(event.getBlock().getWorld().getName()) + "\"}");
    }

    private void pollMetrics(long intervalSeconds) {
        if (!isConnected()) return;
        Collection<? extends Player> players = plugin.getServer().getOnlinePlayers();
        for (Player player : players) {
            enqueue(player, "PLAYTIME", "{\"seconds\":" + intervalSeconds + "}");
            for (PluginAdapterRegistry.MetricReading reading : adapters.readMetrics(player)) {
                enqueue(player, "METRIC_SNAPSHOT", "{\"metric\":\"" + reading.metric + "\",\"value\":"
                    + reading.value + ",\"provider\":\"" + json(reading.provider) + "\"}");
            }
        }
    }

    private void enqueue(Player player, String type, String metadata) {
        if (!isConnected()) return;
        String event = "{\"id\":\"" + UUID.randomUUID() + "\",\"serverId\":\"" + json(serverId)
            + "\",\"instanceId\":\"" + instanceId + "\",\"type\":\"" + type + "\",\"occurredAt\":\""
            + Instant.now().toString() + "\",\"minecraftUuid\":\"" + player.getUniqueId()
            + "\",\"metadata\":" + metadata + "}";
        int maxQueue = Math.max(100, plugin.getConfig().getInt("max-queued-events", 5000));
        while (queue.size() >= maxQueue) queue.poll();
        queue.offer(event);
    }

    private void flush() {
        if (!isConnected()) return;
        int sent = 0;
        while (sent++ < 50) {
            String event = queue.poll();
            if (event == null) return;
            try {
                request("POST", "/plugin/events", event, true);
            } catch (Exception error) {
                queue.offer(event);
                plugin.getLogger().warning("Nortix event delivery paused: " + error.getMessage());
                return;
            }
        }
    }

    void publishCapabilities() {
        if (!isConnected()) return;
        plugin.getServer().getScheduler().runTaskAsynchronously(plugin, () -> {
            try {
                String capabilities = adapters.capabilities().stream().map(PluginCapability::toJson).collect(Collectors.joining(","));
                String body = "{\"serverId\":\"" + json(serverId) + "\",\"instanceId\":\"" + instanceId
                    + "\",\"platform\":\"PAPER\",\"pluginVersion\":\"" + NortixPaperPlugin.VERSION
                    + "\",\"proxyServerName\":\"" + json(proxyServerName) + "\",\"capabilities\":[" + capabilities + "]}";
                request("POST", "/plugin/capabilities", body, true);
            } catch (Exception error) {
                plugin.getLogger().warning("Could not publish Nortix capabilities: " + error.getMessage());
            }
        });
    }

    void sendVerificationHandshake(String code) {
        plugin.getServer().getScheduler().runTaskAsynchronously(plugin, () -> {
            try {
                String body = "{\"code\":\"" + json(code) + "\",\"platform\":\"PAPER\",\"pluginVersion\":\""
                    + NortixPaperPlugin.VERSION + "\",\"publicAddress\":\""
                    + json(plugin.getConfig().getString("public-address", "")) + "\"}";
                request("POST", "/plugin/verifications/handshake", body, false);
            } catch (Exception error) {
                plugin.getLogger().warning("Nortix verification handshake failed: " + error.getMessage());
            }
        });
    }

    String request(String method, String path, String body, boolean authenticated) throws Exception {
        String base = plugin.getConfig().getString("api-base-url", "https://hub.nortixlabs.com/api/v1");
        HttpURLConnection connection = (HttpURLConnection) new URL(base.replaceAll("/$", "") + path).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(5000);
        connection.setReadTimeout(7000);
        connection.setRequestProperty("Accept", "application/json");
        if (authenticated) connection.setRequestProperty("Authorization", "Bearer " + serverToken);
        if (body != null) {
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            try (OutputStream output = connection.getOutputStream()) {
                output.write(body.getBytes(StandardCharsets.UTF_8));
            }
        }
        int status = connection.getResponseCode();
        InputStream stream = status >= 200 && status < 300 ? connection.getInputStream() : connection.getErrorStream();
        String response = "";
        if (stream != null) {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                response = reader.lines().collect(Collectors.joining());
            }
        }
        if (status < 200 || status >= 300) throw new IllegalStateException("HTTP " + status + ": " + response);
        return response;
    }

    static String json(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"")
            .replace("\n", "\\n").replace("\r", "\\r");
    }

    static String jsonArray(List<String> values) {
        return values.stream().map(value -> "\"" + json(value) + "\"").collect(Collectors.joining(",", "[", "]"));
    }
}
