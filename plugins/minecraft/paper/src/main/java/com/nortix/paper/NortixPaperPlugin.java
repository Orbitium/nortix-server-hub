package com.nortix.paper;

import java.util.Locale;
import java.util.regex.Pattern;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.server.ServerListPingEvent;
import org.bukkit.plugin.java.JavaPlugin;

public final class NortixPaperPlugin extends JavaPlugin implements Listener {
    static final String VERSION = "0.3.0";
    private static final Pattern CODE = Pattern.compile("^NORTIX-[A-Z0-9]{4}-[A-Z0-9]{4}$");
    private volatile String verificationCode = "";
    private MilestoneReporter reporter;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        verificationCode = normalize(getConfig().getString("verification-code", ""));
        getServer().getPluginManager().registerEvents(this, this);
        if (getCommand("nortix") != null) getCommand("nortix").setExecutor(this);

        reporter = new MilestoneReporter(this);
        reporter.start();
        if (!verificationCode.isEmpty()) {
            reporter.sendVerificationHandshake(verificationCode);
            startStatusPoll();
        }
        getLogger().info("Nortix milestone tracking ready with " + reporter.getCapabilities().size()
            + " capabilities. Gameplay events are sent only after a server token is configured.");
    }

    @Override
    public void onDisable() {
        if (reporter != null) reporter.stop();
    }

    @EventHandler
    public void onServerListPing(ServerListPingEvent event) {
        if (verificationCode.isEmpty() || !getConfig().getBoolean("plugin-motd", true)) return;
        String existing = event.getMotd() == null ? "" : event.getMotd();
        event.setMotd(existing + "\n" + ChatColor.DARK_GRAY + "[" + verificationCode + "]");
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!sender.hasPermission("nortix.admin")) {
            sender.sendMessage(ChatColor.RED + "You do not have permission to configure Nortix.");
            return true;
        }
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
            reporter.sendVerificationHandshake(candidate);
            startStatusPoll();
            return true;
        }
        if (args.length >= 3 && args[0].equalsIgnoreCase("connect")) {
            getConfig().set("server-id", args[1]);
            getConfig().set("server-token", args[2]);
            if (args.length >= 4) getConfig().set("proxy-server-name", args[3]);
            saveConfig();
            reporter.reloadConnection();
            sender.sendMessage(ChatColor.GREEN + "Nortix milestone tracking connected for this backend server.");
            sender.sendMessage(ChatColor.GRAY + "The token is stored in config.yml and will never be printed.");
            return true;
        }
        if (args.length == 1 && args[0].equalsIgnoreCase("capabilities")) {
            sender.sendMessage(ChatColor.GREEN + "Nortix detected: " + reporter.capabilitySummary());
            reporter.publishCapabilities();
            return true;
        }
        if (args.length == 1 && args[0].equalsIgnoreCase("status")) {
            sender.sendMessage(reporter.isConnected()
                ? ChatColor.GREEN + "Milestone tracking connected as server " + reporter.getServerId() + "."
                : ChatColor.YELLOW + "Milestone tracking is not connected. Generate a token on the Nortix website.");
            if (!verificationCode.isEmpty()) checkVerificationStatus(sender);
            return true;
        }
        if (args.length == 1 && args[0].equalsIgnoreCase("clear")) {
            clearCode();
            sender.sendMessage(ChatColor.YELLOW + "Nortix verification code cleared.");
            return true;
        }
        sender.sendMessage(ChatColor.GRAY + "/nortix verify CODE");
        sender.sendMessage(ChatColor.GRAY + "/nortix connect SERVER_ID TOKEN [PROXY_BACKEND_NAME]");
        sender.sendMessage(ChatColor.GRAY + "/nortix capabilities, /nortix status, or /nortix clear");
        return true;
    }

    private void startStatusPoll() {
        getServer().getScheduler().runTaskTimerAsynchronously(this, () -> {
            if (verificationCode.isEmpty()) return;
            try {
                String response = reporter.request("GET", "/plugin/verifications/status?code="
                    + verificationCode + "&platform=PAPER", null, false);
                if (response.contains("\"status\":\"VERIFIED\"")) {
                    getServer().getScheduler().runTask(this, () -> {
                        clearCode();
                        getLogger().info("Nortix ownership verified; the temporary MOTD code was removed.");
                    });
                }
            } catch (Exception ignored) {
                // Verification polling never disrupts gameplay.
            }
        }, 20L * 10L, 20L * 30L);
    }

    private void checkVerificationStatus(CommandSender sender) {
        getServer().getScheduler().runTaskAsynchronously(this, () -> {
            try {
                String response = reporter.request("GET", "/plugin/verifications/status?code="
                    + verificationCode + "&platform=PAPER", null, false);
                sender.sendMessage(response.contains("\"status\":\"VERIFIED\"")
                    ? ChatColor.GREEN + "Nortix reports this server as verified."
                    : ChatColor.YELLOW + "Nortix is still waiting for the public MOTD check.");
            } catch (Exception error) {
                sender.sendMessage(ChatColor.RED + "Could not reach Nortix: " + error.getMessage());
            }
        });
    }

    private void clearCode() {
        verificationCode = "";
        getConfig().set("verification-code", "");
        saveConfig();
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }
}
