package com.nortix.paper;

import com.nortix.contracts.PluginRequestSigner;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.Collection;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
    private final Set<String> completedStoreDeliveries = ConcurrentHashMap.newKeySet();
    private final String instanceId = UUID.randomUUID().toString();
    private volatile String serverId;
    private volatile PluginRequestSigner requestSigner;
    private volatile String proxyServerName;
    private BukkitTask flushTask;
    private BukkitTask metricTask;
    private BukkitTask capabilityTask;
    private BukkitTask presenceTask;
    private BukkitTask storeDeliveryTask;

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
        loadStoreDeliveryHistory();
        storeDeliveryTask = plugin.getServer().getScheduler().runTaskTimerAsynchronously(
            plugin, this::pollStoreDeliveries, 20L * 20L, 20L * 10L);
    }

    void stop() {
        if (flushTask != null) flushTask.cancel();
        if (metricTask != null) metricTask.cancel();
        if (capabilityTask != null) capabilityTask.cancel();
        if (presenceTask != null) presenceTask.cancel();
        if (storeDeliveryTask != null) storeDeliveryTask.cancel();
        flush();
    }

    void reloadConnection() {
        serverId = plugin.getConfig().getString("server-id", "").trim();
        proxyServerName = plugin.getConfig().getString("proxy-server-name", "").trim();
        try {
            requestSigner = new PluginRequestSigner(
                serverId,
                plugin.getConfig().getString("server-key-id", "").trim(),
                plugin.getConfig().getString("server-private-key", "").trim()
            );
        } catch (Exception error) {
            requestSigner = null;
            if (!serverId.isEmpty()) {
                plugin.getLogger().warning("Nortix signing credentials are incomplete or invalid.");
            }
        }
        if (isConnected()) publishCapabilities();
    }

    boolean isConnected() {
        return !serverId.isEmpty() && requestSigner != null;
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

    void completeCrackedClaim(
        Player player,
        String claimCode,
        Runnable onSuccess,
        Consumer<String> onError
    ) {
        if (!isConnected()) {
            onError.accept("This server is not connected to Nortix.");
            return;
        }
        String body = crackedClaimBody(
            serverId,
            instanceId,
            claimCode,
            player.getUniqueId().toString(),
            player.getName(),
            Instant.now().toString()
        );
        plugin.getServer().getScheduler().runTaskAsynchronously(plugin, () -> {
            try {
                request("POST", "/plugin/cracked-claims/complete", body, true);
                onSuccess.run();
            } catch (Exception error) {
                onError.accept(error.getMessage() != null && error.getMessage().startsWith("HTTP 4")
                    ? "That claim is invalid, expired, or does not match this player."
                    : "Nortix account linking is temporarily unavailable.");
            }
        });
    }

    static String crackedClaimBody(
        String serverId,
        String instanceId,
        String claimCode,
        String minecraftUuid,
        String minecraftUsername,
        String occurredAt
    ) {
        return "{\"serverId\":\"" + json(serverId) + "\",\"instanceId\":\""
            + json(instanceId) + "\",\"claimCode\":\"" + json(claimCode)
            + "\",\"minecraftUuid\":\"" + json(minecraftUuid)
            + "\",\"minecraftUsername\":\"" + json(minecraftUsername)
            + "\",\"occurredAt\":\"" + json(occurredAt) + "\"}";
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

    private void pollStoreDeliveries() {
        if (!isConnected()) return;
        try {
            String response = request(
                "GET",
                "/plugin/store-deliveries/next?serverId=" + serverId,
                null,
                true
            );
            if (response.contains("\"delivery\":null")) return;
            String deliveryId = jsonStringValue(response, "id");
            List<String> commands = jsonStringArray(response, "commands");
            if (deliveryId.isEmpty() || commands.isEmpty()) return;
            if (completedStoreDeliveries.contains(deliveryId)) {
                acknowledgeStoreDelivery(deliveryId, true, null);
                return;
            }
            plugin.getServer().getScheduler().runTask(plugin, () -> {
                boolean success = true;
                String failure = null;
                for (String configured : commands) {
                    String command = configured.startsWith("/") ? configured.substring(1) : configured;
                    try {
                        if (!plugin.getServer().dispatchCommand(plugin.getServer().getConsoleSender(), command)) {
                            success = false;
                            failure = "A configured server command was not accepted.";
                            break;
                        }
                    } catch (Exception error) {
                        success = false;
                        failure = "A configured server command failed.";
                        plugin.getLogger().warning("Nortix store delivery command failed: " + error.getMessage());
                        break;
                    }
                }
                if (success) rememberStoreDelivery(deliveryId);
                final boolean delivered = success;
                final String deliveryError = failure;
                plugin.getServer().getScheduler().runTaskAsynchronously(
                    plugin,
                    () -> acknowledgeStoreDelivery(deliveryId, delivered, deliveryError)
                );
            });
        } catch (Exception error) {
            plugin.getLogger().warning("Could not poll Nortix store deliveries: " + error.getMessage());
        }
    }

    private void acknowledgeStoreDelivery(String deliveryId, boolean success, String error) {
        String body = "{\"serverId\":\"" + json(serverId) + "\",\"deliveryId\":\""
            + json(deliveryId) + "\",\"success\":" + success
            + (error == null ? "" : ",\"error\":\"" + json(error) + "\"") + "}";
        try {
            request("POST", "/plugin/store-deliveries/result", body, true);
        } catch (Exception acknowledgeError) {
            plugin.getLogger().warning(
                "Could not acknowledge Nortix store delivery " + deliveryId + ": "
                    + acknowledgeError.getMessage()
            );
        }
    }

    private void loadStoreDeliveryHistory() {
        Path history = plugin.getDataFolder().toPath().resolve("store-deliveries.log");
        if (!Files.exists(history)) return;
        try {
            List<String> lines = Files.readAllLines(history, StandardCharsets.UTF_8);
            int start = Math.max(0, lines.size() - 1000);
            completedStoreDeliveries.addAll(lines.subList(start, lines.size()));
        } catch (Exception error) {
            plugin.getLogger().warning("Could not read Nortix store delivery history.");
        }
    }

    private void rememberStoreDelivery(String deliveryId) {
        completedStoreDeliveries.add(deliveryId);
        Path history = plugin.getDataFolder().toPath().resolve("store-deliveries.log");
        try {
            Files.write(
                history,
                (deliveryId + System.lineSeparator()).getBytes(StandardCharsets.UTF_8),
                StandardOpenOption.CREATE,
                StandardOpenOption.APPEND
            );
        } catch (Exception error) {
            plugin.getLogger().warning("Could not persist Nortix store delivery history.");
        }
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
        if (authenticated) {
            requestSigner.sign(connection, method, path, body, idempotencyKey(body));
        }
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

    private static String idempotencyKey(String body) {
        if (body != null) {
            Matcher matcher = Pattern.compile("\"id\":\"([A-Za-z0-9:_-]{8,160})\"").matcher(body);
            if (matcher.find()) return matcher.group(1);
        }
        return UUID.randomUUID().toString();
    }

    private static String jsonStringValue(String body, String key) {
        Matcher matcher = Pattern
            .compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*\"((?:\\\\.|[^\"])*)\"")
            .matcher(body);
        return matcher.find() ? unescapeJson(matcher.group(1)) : "";
    }

    private static List<String> jsonStringArray(String body, String key) {
        List<String> values = new ArrayList<>();
        Matcher field = Pattern
            .compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*\\[")
            .matcher(body);
        if (!field.find()) return values;
        StringBuilder current = null;
        boolean escaped = false;
        for (int index = field.end(); index < body.length(); index++) {
            char item = body.charAt(index);
            if (current == null) {
                if (item == ']') break;
                if (item == '"') current = new StringBuilder();
                continue;
            }
            if (escaped) {
                current.append('\\').append(item);
                escaped = false;
            } else if (item == '\\') {
                escaped = true;
            } else if (item == '"') {
                values.add(unescapeJson(current.toString()));
                current = null;
            } else {
                current.append(item);
            }
        }
        return values;
    }

    private static String unescapeJson(String value) {
        StringBuilder result = new StringBuilder();
        boolean escaped = false;
        for (int index = 0; index < value.length(); index++) {
            char item = value.charAt(index);
            if (escaped) {
                if (item == 'n') result.append('\n');
                else if (item == 'r') result.append('\r');
                else if (item == 't') result.append('\t');
                else result.append(item);
                escaped = false;
            } else if (item == '\\') {
                escaped = true;
            } else {
                result.append(item);
            }
        }
        if (escaped) result.append('\\');
        return result.toString();
    }

    static String json(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"")
            .replace("\n", "\\n").replace("\r", "\\r");
    }

    static String jsonArray(List<String> values) {
        return values.stream().map(value -> "\"" + json(value) + "\"").collect(Collectors.joining(",", "[", "]"));
    }
}
