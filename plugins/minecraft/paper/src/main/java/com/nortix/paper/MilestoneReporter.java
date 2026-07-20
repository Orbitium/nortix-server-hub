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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import org.bukkit.entity.EntityType;
import org.bukkit.OfflinePlayer;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.entity.EntityDeathEvent;
import org.bukkit.event.entity.PlayerDeathEvent;
import org.bukkit.event.player.PlayerJoinEvent;
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
    private BukkitTask presenceTask;

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
        long presenceInterval = Math.max(30L, Math.min(60L,
            plugin.getConfig().getLong("presence-snapshot-seconds", 60L)));
        if (plugin.getConfig().getBoolean("privacy-conscious-analytics", true)) {
            presenceTask = plugin.getServer().getScheduler().runTaskTimer(
                plugin, this::publishPresence, 20L * 15L, presenceInterval * 20L);
        }
        if (plugin.getConfig().getBoolean("sync-player-history", true)) {
            plugin.getServer().getScheduler().runTaskLater(plugin, this::syncPlayerHistory, 20L * 10L);
        }
    }

    void stop() {
        if (flushTask != null) flushTask.cancel();
        if (metricTask != null) metricTask.cancel();
        if (capabilityTask != null) capabilityTask.cancel();
        if (presenceTask != null) presenceTask.cancel();
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

    @EventHandler(priority = EventPriority.MONITOR)
    public void onPlayerJoin(PlayerJoinEvent event) {
        enqueue(event.getPlayer(), "PLAYER_JOIN", "{}");
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

    private void publishPresence() {
        if (!isConnected()) return;
        Collection<? extends Player> online = plugin.getServer().getOnlinePlayers();
        List<String> players = new ArrayList<>();
        for (Player player : online) {
            String backend = proxyServerName.isEmpty() ? "" : ",\"backend\":\"" + json(proxyServerName) + "\"";
            players.add("{\"minecraftUuid\":\"" + player.getUniqueId() + "\"" + backend + "}");
        }
        String body = "{\"id\":\"" + UUID.randomUUID() + "\",\"serverId\":\"" + json(serverId)
            + "\",\"instanceId\":\"" + instanceId + "\",\"platform\":\"PAPER\",\"pluginVersion\":\""
            + NortixPaperPlugin.VERSION + "\",\"serverVersion\":\""
            + json(plugin.getServer().getBukkitVersion()) + "\",\"observedAt\":\""
            + Instant.now().toString() + "\",\"onlinePlayers\":" + players.size()
            + ",\"maxPlayers\":" + plugin.getServer().getMaxPlayers() + ",\"players\":["
            + String.join(",", players) + "]}";
        plugin.getServer().getScheduler().runTaskAsynchronously(plugin, () -> {
            try {
                request("POST", "/plugin/presence", body, true);
            } catch (Exception error) {
                plugin.getLogger().warning("Could not publish Nortix activity sample: " + error.getMessage());
            }
        });
    }

    void requestPublicProfile(
        String minecraftUsername,
        Consumer<String> onFound,
        Runnable onMissing,
        Consumer<String> onError
    ) {
        if (!isConnected()) {
            onError.accept("This server is not connected to Nortix.");
            return;
        }
        plugin.getServer().getScheduler().runTaskAsynchronously(plugin, () -> {
            try {
                String response = request("GET", "/plugin/public-profiles/"
                    + minecraftUsername + "?serverId=" + serverId, null, true);
                onFound.accept(response);
            } catch (Exception error) {
                if (error.getMessage() != null && error.getMessage().startsWith("HTTP 404")) {
                    onMissing.run();
                } else {
                    onError.accept("Nortix profiles are temporarily unavailable.");
                }
            }
        });
    }

    private void enqueue(Player player, String type, String metadata) {
        if (!isConnected()) return;
        String event = "{\"id\":\"" + UUID.randomUUID() + "\",\"serverId\":\"" + json(serverId)
            + "\",\"instanceId\":\"" + instanceId + "\",\"type\":\"" + type + "\",\"occurredAt\":\""
            + Instant.now().toString() + "\",\"minecraftUuid\":\"" + player.getUniqueId()
            + "\",\"minecraftUsername\":\"" + json(player.getName())
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

    private void syncPlayerHistory() {
        if (!isConnected()) return;
        List<String> players = new ArrayList<>();
        for (OfflinePlayer player : plugin.getServer().getOfflinePlayers()) {
            String name = player.getName();
            if (name == null || !name.matches("^[A-Za-z0-9_]{3,16}$")) continue;
            long firstPlayed = player.getFirstPlayed();
            String seenAt = Instant.ofEpochMilli(firstPlayed > 0 ? firstPlayed : System.currentTimeMillis()).toString();
            players.add("{\"minecraftUsername\":\"" + json(name) + "\",\"firstSeenAt\":\"" + seenAt + "\"}");
        }
        plugin.getServer().getScheduler().runTaskAsynchronously(plugin, () -> {
            if (players.isEmpty()) {
                try {
                    request("POST", "/plugin/player-history", "{\"serverId\":\"" + json(serverId)
                        + "\",\"instanceId\":\"" + instanceId + "\",\"complete\":true,\"players\":[]}", true);
                } catch (Exception error) {
                    plugin.getLogger().warning("Could not confirm empty player history: " + error.getMessage());
                }
                return;
            }
            for (int start = 0; start < players.size(); start += 250) {
                int end = Math.min(start + 250, players.size());
                String body = "{\"serverId\":\"" + json(serverId) + "\",\"instanceId\":\""
                    + instanceId + "\",\"complete\":" + (end == players.size()) + ",\"players\":["
                    + String.join(",", players.subList(start, end)) + "]}";
                try {
                    request("POST", "/plugin/player-history", body, true);
                } catch (Exception error) {
                    plugin.getLogger().warning("Could not sync existing player history: " + error.getMessage());
                    return;
                }
            }
            if (!players.isEmpty()) plugin.getLogger().info("Nortix synced " + players.size()
                + " previously seen player names for first-join protection.");
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
