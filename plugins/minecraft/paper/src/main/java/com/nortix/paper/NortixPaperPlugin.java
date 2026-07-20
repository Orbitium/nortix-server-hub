package com.nortix.paper;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.server.ServerListPingEvent;
import org.bukkit.plugin.java.JavaPlugin;

public final class NortixPaperPlugin extends JavaPlugin implements Listener {
    private static final String VERSION = "0.1.0";
    private static final Pattern CODE = Pattern.compile("^NORTIX-[A-Z0-9]{4}-[A-Z0-9]{4}$");
    private volatile String verificationCode = "";

    @Override
    public void onEnable() {
        saveDefaultConfig();
        verificationCode = normalize(getConfig().getString("verification-code", ""));
        getServer().getPluginManager().registerEvents(this, this);
        if (getCommand("nortix") != null) {
            getCommand("nortix").setExecutor(this);
        }
        if (!verificationCode.isEmpty()) {
            sendHandshake();
            startStatusPoll();
        }
        getLogger().info("Nortix verification is ready. No gameplay data is collected.");
    }

    @EventHandler
    public void onServerListPing(ServerListPingEvent event) {
        if (verificationCode.isEmpty() || !getConfig().getBoolean("plugin-motd", true)) return;
        String existing = event.getMotd() == null ? "" : event.getMotd();
        event.setMotd(existing + "\n" + ChatColor.DARK_GRAY + "[" + verificationCode + "]");
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length == 2 && args[0].equalsIgnoreCase("verify")) {
            String candidate = normalize(args[1]);
            if (!CODE.matcher(candidate).matches()) {
                sender.sendMessage(ChatColor.RED + "Expected a code like NORTIX-A1B2-C3D4.");
                return true;
            }
            verificationCode = candidate;
            getConfig().set("verification-code", candidate);
            saveConfig();
            sender.sendMessage(ChatColor.GREEN + "Nortix code published in the ping MOTD.");
            sendHandshake();
            startStatusPoll();
            return true;
        }
        if (args.length == 1 && args[0].equalsIgnoreCase("status")) {
            sender.sendMessage(verificationCode.isEmpty()
                ? ChatColor.YELLOW + "No active Nortix verification code."
                : ChatColor.GREEN + "Publishing " + verificationCode + " until Nortix confirms the claim.");
            if (!verificationCode.isEmpty()) checkStatus(sender);
            return true;
        }
        if (args.length == 1 && args[0].equalsIgnoreCase("clear")) {
            clearCode();
            sender.sendMessage(ChatColor.YELLOW + "Nortix verification code cleared.");
            return true;
        }
        sender.sendMessage(ChatColor.GRAY + "/nortix verify CODE, /nortix status, or /nortix clear");
        return true;
    }

    private void sendHandshake() {
        runAsync(() -> {
            try {
                String body = "{\"code\":\"" + verificationCode + "\",\"platform\":\"PAPER\","
                    + "\"pluginVersion\":\"" + VERSION + "\",\"publicAddress\":\""
                    + json(getConfig().getString("public-address", "")) + "\"}";
                request("POST", "/plugin/verifications/handshake", body);
                getLogger().info("Nortix accepted the verification handshake.");
            } catch (Exception error) {
                getLogger().warning("Nortix handshake failed: " + error.getMessage());
            }
        });
    }

    private void startStatusPoll() {
        getServer().getScheduler().runTaskTimerAsynchronously(this, () -> {
            if (verificationCode.isEmpty()) return;
            try {
                String response = request("GET", "/plugin/verifications/status?code="
                    + verificationCode + "&platform=PAPER", null);
                if (response.contains("\"status\":\"VERIFIED\"")) {
                    getServer().getScheduler().runTask(this, () -> {
                        clearCode();
                        getLogger().info("Nortix ownership verified; the temporary MOTD code was removed.");
                    });
                }
            } catch (Exception ignored) {
                // A short outage should not disrupt the server or its public ping.
            }
        }, 20L * 10L, 20L * 30L);
    }

    private void checkStatus(CommandSender sender) {
        runAsync(() -> {
            try {
                String response = request("GET", "/plugin/verifications/status?code="
                    + verificationCode + "&platform=PAPER", null);
                sender.sendMessage(response.contains("\"status\":\"VERIFIED\"")
                    ? ChatColor.GREEN + "Nortix reports this server as verified."
                    : ChatColor.YELLOW + "Nortix is still waiting for the public MOTD check.");
            } catch (Exception error) {
                sender.sendMessage(ChatColor.RED + "Could not reach Nortix: " + error.getMessage());
            }
        });
    }

    private String request(String method, String path, String body) throws Exception {
        String base = getConfig().getString("api-base-url", "https://hub.nortixlabs.com/api/v1");
        HttpURLConnection connection = (HttpURLConnection) new URL(base.replaceAll("/$", "") + path).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(5000);
        connection.setReadTimeout(5000);
        connection.setRequestProperty("Accept", "application/json");
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

    private void runAsync(Runnable task) {
        getServer().getScheduler().runTaskAsynchronously(this, task);
    }

    private void clearCode() {
        verificationCode = "";
        getConfig().set("verification-code", "");
        saveConfig();
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private static String json(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
