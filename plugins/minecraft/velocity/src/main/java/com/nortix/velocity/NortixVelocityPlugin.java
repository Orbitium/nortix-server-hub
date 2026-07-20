package com.nortix.velocity;

import com.google.inject.Inject;
import com.velocitypowered.api.command.CommandMeta;
import com.velocitypowered.api.command.SimpleCommand;
import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.proxy.ProxyInitializeEvent;
import com.velocitypowered.api.event.proxy.ProxyPingEvent;
import com.velocitypowered.api.plugin.Plugin;
import com.velocitypowered.api.plugin.annotation.DataDirectory;
import com.velocitypowered.api.proxy.ProxyServer;
import com.velocitypowered.api.proxy.Player;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Locale;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import net.kyori.adventure.text.Component;
import org.slf4j.Logger;

@Plugin(
    id = "nortix-verification",
    name = "Nortix Proxy",
    version = "0.4.0",
    description = "Verifies one public Velocity proxy; Paper backends report milestones separately"
)
public final class NortixVelocityPlugin {
    private static final String VERSION = "0.4.0";
    private static final Pattern CODE = Pattern.compile("^NORTIX-[A-Z0-9]{4}-[A-Z0-9]{4}$");
    private final ProxyServer proxy;
    private final Logger logger;
    private final Path dataDirectory;
    private final Properties config = new Properties();
    private final String instanceId = UUID.randomUUID().toString();
    private volatile String verificationCode = "";

    @Inject
    public NortixVelocityPlugin(ProxyServer proxy, Logger logger, @DataDirectory Path dataDirectory) {
        this.proxy = proxy;
        this.logger = logger;
        this.dataDirectory = dataDirectory;
    }

    @Subscribe
    public void onInitialize(ProxyInitializeEvent event) {
        loadConfig();
        CommandMeta meta = proxy.getCommandManager().metaBuilder("nortixproxy")
            .aliases("ntxproxy")
            .plugin(this)
            .build();
        proxy.getCommandManager().register(meta, new VerificationCommand());
        CommandMeta publicMeta = proxy.getCommandManager().metaBuilder("nortix")
            .aliases("ntx")
            .plugin(this)
            .build();
        proxy.getCommandManager().register(publicMeta, new PublicProfileCommand());
        startPresenceSnapshots();
        if (!verificationCode.isEmpty()) {
            sendHandshake();
            startStatusPoll();
        }
        logger.info("Nortix proxy verification is ready. One claim covers this proxy network.");
    }

    @Subscribe
    public void onProxyPing(ProxyPingEvent event) {
        if (verificationCode.isEmpty() || !Boolean.parseBoolean(config.getProperty("plugin-motd", "true"))) return;
        String baseMotd = config.getProperty("base-motd", "A Minecraft Network");
        event.setPing(event.getPing().asBuilder()
            .description(Component.text(baseMotd + "\n[" + verificationCode + "]"))
            .build());
    }

    private final class VerificationCommand implements SimpleCommand {
        @Override
        public void execute(Invocation invocation) {
            if (!invocation.source().hasPermission("nortix.verify")) {
                invocation.source().sendMessage(Component.text("You need the nortix.verify permission."));
                return;
            }
            String[] args = invocation.arguments();
            if (args.length == 2 && args[0].equalsIgnoreCase("verify")) {
                String candidate = normalize(args[1]);
                if (!CODE.matcher(candidate).matches()) {
                    invocation.source().sendMessage(Component.text("Expected a code like NORTIX-A1B2-C3D4."));
                    return;
                }
                verificationCode = candidate;
                config.setProperty("verification-code", candidate);
                saveConfig();
                invocation.source().sendMessage(Component.text("Nortix code published. This one proxy claim covers its backend network."));
                sendHandshake();
                startStatusPoll();
                return;
            }
            if (args.length == 1 && args[0].equalsIgnoreCase("clear")) {
                clearCode();
                invocation.source().sendMessage(Component.text("Nortix verification code cleared."));
                return;
            }
            if (args.length == 1 && args[0].equalsIgnoreCase("status")) {
                invocation.source().sendMessage(Component.text(verificationCode.isEmpty()
                    ? "No active Nortix verification code."
                    : "Publishing " + verificationCode + "; checking Nortix now."));
                if (!verificationCode.isEmpty()) checkStatus(invocation);
                return;
            }
            if (args.length == 3 && args[0].equalsIgnoreCase("connect")) {
                config.setProperty("server-id", args[1]);
                config.setProperty("server-token", args[2]);
                saveConfig();
                invocation.source().sendMessage(Component.text(
                    "Nortix analytics connected. The token is stored privately and is never printed."));
                return;
            }
            invocation.source().sendMessage(Component.text(
                "/nortixproxy verify CODE, /nortixproxy connect SERVER_ID TOKEN, /nortixproxy status, or /nortixproxy clear"));
        }
    }

    private final class PublicProfileCommand implements SimpleCommand {
        @Override
        public void execute(Invocation invocation) {
            String[] args = invocation.arguments();
            if (args.length == 0 || (args.length == 1 && args[0].equalsIgnoreCase("help"))) {
                invocation.source().sendMessage(Component.text("Nortix profiles"));
                invocation.source().sendMessage(Component.text("/nortix <player> - view a public Nortix profile"));
                return;
            }
            if (args.length != 1 || !args[0].matches("^[A-Za-z0-9_]{3,16}$")) {
                invocation.source().sendMessage(Component.text("Use /nortix help or /nortix <player>."));
                return;
            }
            String serverId = config.getProperty("server-id", "").trim();
            if (serverId.isEmpty() || config.getProperty("server-token", "").trim().isEmpty()) {
                invocation.source().sendMessage(Component.text("Nortix profiles are not connected on this proxy."));
                return;
            }
            proxy.getScheduler().buildTask(NortixVelocityPlugin.this, () -> {
                try {
                    String response = request("GET", "/plugin/public-profiles/"
                        + args[0] + "?serverId=" + serverId, null, true);
                    invocation.source().sendMessage(Component.text("Nortix · " + jsonValue(response, "displayName", args[0])));
                    invocation.source().sendMessage(Component.text("@" + jsonValue(response, "nortixUsername", args[0])
                        + " · " + jsonValue(response, "reputationTier", "Nortix member")));
                    invocation.source().sendMessage(Component.text("Level " + numberValue(response, "testerLevel")
                        + " · " + numberValue(response, "reputationScore") + " reputation · "
                        + numberValue(response, "verifiedMilestones") + " verified milestones"));
                } catch (Exception error) {
                    invocation.source().sendMessage(Component.text(
                        error.getMessage() != null && error.getMessage().startsWith("HTTP 404")
                            ? "This user is not registered to Nortix."
                            : "Nortix profiles are temporarily unavailable."));
                }
            }).schedule();
        }
    }

    private void loadConfig() {
        try {
            Files.createDirectories(dataDirectory);
            Path file = dataDirectory.resolve("config.properties");
            if (Files.exists(file)) {
                try (InputStream input = Files.newInputStream(file)) {
                    config.load(input);
                }
            }
            config.putIfAbsent("api-base-url", "https://hub.nortixlabs.com/api/v1");
            config.putIfAbsent("public-address", "");
            config.putIfAbsent("verification-code", "");
            config.putIfAbsent("plugin-motd", "true");
            config.putIfAbsent("base-motd", "A Minecraft Network");
            config.putIfAbsent("server-id", "");
            config.putIfAbsent("server-token", "");
            config.putIfAbsent("privacy-conscious-analytics", "true");
            verificationCode = normalize(config.getProperty("verification-code"));
            saveConfig();
        } catch (IOException error) {
            logger.error("Could not load Nortix configuration", error);
        }
    }

    private void saveConfig() {
        try (OutputStream output = Files.newOutputStream(dataDirectory.resolve("config.properties"))) {
            config.store(output, "Nortix ownership verification");
        } catch (IOException error) {
            logger.error("Could not save Nortix configuration", error);
        }
    }

    private void sendHandshake() {
        proxy.getScheduler().buildTask(this, () -> {
            try {
                String body = "{\"code\":\"" + verificationCode + "\",\"platform\":\"VELOCITY\","
                    + "\"pluginVersion\":\"" + VERSION + "\",\"publicAddress\":\""
                    + json(config.getProperty("public-address", "")) + "\"}";
                request("POST", "/plugin/verifications/handshake", body);
                logger.info("Nortix accepted the proxy verification handshake.");
            } catch (Exception error) {
                logger.warn("Nortix handshake failed: {}", error.getMessage());
            }
        }).schedule();
    }

    private void startStatusPoll() {
        proxy.getScheduler().buildTask(this, () -> {
            if (verificationCode.isEmpty()) return;
            try {
                String response = request("GET", "/plugin/verifications/status?code="
                    + URLEncoder.encode(verificationCode, StandardCharsets.UTF_8.name())
                    + "&platform=VELOCITY", null);
                if (response.contains("\"status\":\"VERIFIED\"")) {
                    clearCode();
                    logger.info("Nortix proxy ownership verified; the temporary MOTD code was removed.");
                }
            } catch (Exception ignored) {
                // Verification is control-plane only and must never affect proxy availability.
            }
        }).repeat(30, TimeUnit.SECONDS).schedule();
    }

    private void startPresenceSnapshots() {
        if (!Boolean.parseBoolean(config.getProperty("privacy-conscious-analytics", "true"))) return;
        proxy.getScheduler().buildTask(this, () -> {
            String serverId = config.getProperty("server-id", "").trim();
            String token = config.getProperty("server-token", "").trim();
            if (serverId.isEmpty() || !token.startsWith("npx_")) return;
            String players = proxy.getAllPlayers().stream().map(player -> {
                String backend = player.getCurrentServer()
                    .map(connection -> connection.getServerInfo().getName())
                    .orElse("unassigned");
                return "{\"minecraftUuid\":\"" + player.getUniqueId() + "\",\"backend\":\""
                    + json(backend) + "\"}";
            }).collect(Collectors.joining(","));
            String body = "{\"id\":\"" + UUID.randomUUID() + "\",\"serverId\":\"" + json(serverId)
                + "\",\"instanceId\":\"" + instanceId + "\",\"platform\":\"VELOCITY\","
                + "\"pluginVersion\":\"" + VERSION + "\",\"serverVersion\":\"Velocity\","
                + "\"observedAt\":\"" + Instant.now().toString() + "\",\"onlinePlayers\":"
                + proxy.getPlayerCount() + ",\"players\":[" + players + "]}";
            try {
                request("POST", "/plugin/presence", body, true);
            } catch (Exception error) {
                logger.warn("Could not publish Nortix proxy activity sample: {}", error.getMessage());
            }
        }).repeat(60, TimeUnit.SECONDS).schedule();
    }

    private void checkStatus(SimpleCommand.Invocation invocation) {
        proxy.getScheduler().buildTask(this, () -> {
            try {
                String response = request("GET", "/plugin/verifications/status?code="
                    + URLEncoder.encode(verificationCode, StandardCharsets.UTF_8.name())
                    + "&platform=VELOCITY", null);
                invocation.source().sendMessage(Component.text(response.contains("\"status\":\"VERIFIED\"")
                    ? "Nortix reports this proxy network as verified."
                    : "Nortix is still waiting for the public MOTD check."));
            } catch (Exception error) {
                invocation.source().sendMessage(Component.text("Could not reach Nortix: " + error.getMessage()));
            }
        }).schedule();
    }

    private String request(String method, String path, String body) throws Exception {
        return request(method, path, body, false);
    }

    private String request(String method, String path, String body, boolean authenticated) throws Exception {
        String base = config.getProperty("api-base-url", "https://hub.nortixlabs.com/api/v1").replaceAll("/$", "");
        HttpURLConnection connection = (HttpURLConnection) new URL(base + path).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(5000);
        connection.setReadTimeout(5000);
        connection.setRequestProperty("Accept", "application/json");
        if (authenticated) {
            connection.setRequestProperty("Authorization",
                "Bearer " + config.getProperty("server-token", "").trim());
        }
        if (body != null) {
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            try (OutputStream output = connection.getOutputStream()) {
                output.write(body.getBytes(StandardCharsets.UTF_8));
            }
        }
        int status = connection.getResponseCode();
        InputStream stream = status >= 200 && status < 300
            ? connection.getInputStream() : connection.getErrorStream();
        String response;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            response = reader.lines().collect(Collectors.joining());
        }
        if (status < 200 || status >= 300) throw new IllegalStateException("HTTP " + status + ": " + response);
        return response;
    }

    private void clearCode() {
        verificationCode = "";
        config.setProperty("verification-code", "");
        saveConfig();
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private static String json(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static String jsonValue(String body, String key, String fallback) {
        java.util.regex.Matcher matcher = Pattern.compile("\"" + Pattern.quote(key)
            + "\"\\s*:\\s*\"((?:\\\\.|[^\"])*)\"").matcher(body);
        return matcher.find() ? matcher.group(1).replace("\\\"", "\"").replace("\\\\", "\\") : fallback;
    }

    private static int numberValue(String body, String key) {
        java.util.regex.Matcher matcher = Pattern.compile("\"" + Pattern.quote(key)
            + "\"\\s*:\\s*(\\d+)").matcher(body);
        return matcher.find() ? Integer.parseInt(matcher.group(1)) : 0;
    }
}
