package com.nortix.identity;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;

public final class NortixIdentityVerifierPlugin extends JavaPlugin {
    private static final Pattern CODE = Pattern.compile("^NX-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$");
    private volatile boolean ready;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        String secret = getConfig().getString("verification-secret", "").trim();
        ready = getServer().getOnlineMode()
            && secret.length() >= 32
            && !secret.startsWith("replace-with");
        if (!getServer().getOnlineMode()) {
            getLogger().severe("DISABLED: the Nortix identity server must use online-mode=true.");
        } else if (!ready) {
            getLogger().severe("DISABLED: configure a dedicated verification-secret of at least 32 characters.");
        } else {
            getLogger().info("Nortix premium identity verification is ready in fail-closed online mode.");
        }
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!(sender instanceof Player)) {
            sender.sendMessage("This command must be used by the player being linked.");
            return true;
        }
        Player player = (Player) sender;
        if (!ready) {
            player.sendMessage(ChatColor.RED + "Account linking is temporarily unavailable.");
            return true;
        }
        if (args.length != 1) {
            player.sendMessage(ChatColor.GRAY + "Use /nortixclaim <code> from your Nortix account page.");
            return true;
        }
        String code = args[0].trim().toUpperCase(Locale.ROOT);
        if (!CODE.matcher(code).matches()) {
            player.sendMessage(ChatColor.RED + "That claim code is not valid.");
            return true;
        }
        UUID uuid = player.getUniqueId();
        String username = player.getName();
        player.sendMessage(ChatColor.YELLOW + "Verifying this authenticated account with Nortix...");
        getServer().getScheduler().runTaskAsynchronously(this, () -> {
            try {
                submit(code, uuid.toString(), username);
                getServer().getScheduler().runTask(this, () ->
                    player.sendMessage(ChatColor.GREEN + "Account linked. You may return to Nortix."));
            } catch (Exception error) {
                getLogger().warning("A player claim was rejected: " + safeStatus(error.getMessage()));
                getServer().getScheduler().runTask(this, () ->
                    player.sendMessage(ChatColor.RED + "The code was invalid, expired, or already used."));
            }
        });
        return true;
    }

    private void submit(String code, String uuid, String username) throws Exception {
        String timestamp = Instant.now().toString();
        String nonce = UUID.randomUUID().toString();
        String canonical = timestamp + "." + nonce + "." + code + "." + uuid + "." + username;
        String signature = hmac(canonical, getConfig().getString("verification-secret"));
        String body = "{\"code\":\"" + code + "\",\"uuid\":\"" + uuid
            + "\",\"username\":\"" + json(username) + "\"}";
        String base = getConfig().getString("api-base-url", "https://hub.nortixlabs.com/api/v1")
            .replaceAll("/$", "");
        HttpURLConnection connection = (HttpURLConnection) new URL(
            base + "/plugin/identity/premium/complete").openConnection();
        connection.setRequestMethod("POST");
        connection.setConnectTimeout(getConfig().getInt("connect-timeout-ms", 5000));
        connection.setReadTimeout(getConfig().getInt("read-timeout-ms", 7000));
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("X-Nortix-Timestamp", timestamp);
        connection.setRequestProperty("X-Nortix-Nonce", nonce);
        connection.setRequestProperty("X-Nortix-Signature", signature);
        connection.setDoOutput(true);
        try (OutputStream output = connection.getOutputStream()) {
            output.write(body.getBytes(StandardCharsets.UTF_8));
        }
        int status = connection.getResponseCode();
        InputStream stream = status >= 200 && status < 300
            ? connection.getInputStream() : connection.getErrorStream();
        if (stream != null) {
            try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                reader.lines().collect(Collectors.joining());
            }
        }
        if (status < 200 || status >= 300) throw new IllegalStateException("HTTP " + status);
    }

    private static String hmac(String value, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] bytes = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte item : bytes) result.append(String.format("%02x", item & 0xff));
        return result.toString();
    }

    private static String json(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static String safeStatus(String value) {
        return value != null && value.startsWith("HTTP ") ? value : "request failed";
    }
}
