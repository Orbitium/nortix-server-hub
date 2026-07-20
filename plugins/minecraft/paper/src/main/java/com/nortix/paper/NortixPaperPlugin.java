package com.nortix.paper;

import java.util.Locale;
import java.util.Arrays;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Material;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.server.ServerListPingEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.inventory.meta.SkullMeta;

public final class NortixPaperPlugin extends JavaPlugin implements Listener {
    static final String VERSION = "0.4.0";
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
        if (args.length == 0 || (args.length == 1 && args[0].equalsIgnoreCase("help"))) {
            sendHelp(sender);
            return true;
        }
        if (args.length == 1 && args[0].matches("^[A-Za-z0-9_]{3,16}$")
            && !isAdminSubcommand(args[0])) {
            if (!(sender instanceof Player)) {
                sender.sendMessage(ChatColor.RED + "Player profiles can only be opened in game.");
                return true;
            }
            Player viewer = (Player) sender;
            String requestedName = args[0];
            viewer.sendMessage(ChatColor.GRAY + "Loading " + requestedName + "'s Nortix profile...");
            reporter.requestPublicProfile(
                requestedName,
                response -> getServer().getScheduler().runTask(this,
                    () -> openProfile(viewer, requestedName, response)),
                () -> getServer().getScheduler().runTask(this,
                    () -> openMissingProfile(viewer, requestedName)),
                message -> getServer().getScheduler().runTask(this,
                    () -> viewer.sendMessage(ChatColor.RED + message))
            );
            return true;
        }
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
        sendHelp(sender);
        return true;
    }

    private void sendHelp(CommandSender sender) {
        sender.sendMessage(ChatColor.GREEN + "Nortix");
        sender.sendMessage(ChatColor.GRAY + "/nortix <player> " + ChatColor.WHITE
            + "Open that player's public Nortix profile");
        sender.sendMessage(ChatColor.GRAY + "/nortix help " + ChatColor.WHITE + "Show this help");
        if (sender.hasPermission("nortix.admin")) {
            sender.sendMessage(ChatColor.DARK_GRAY + "Admin: /nortix verify, connect, capabilities, status, clear");
        }
    }

    private boolean isAdminSubcommand(String value) {
        return value.equalsIgnoreCase("verify") || value.equalsIgnoreCase("connect")
            || value.equalsIgnoreCase("capabilities") || value.equalsIgnoreCase("status")
            || value.equalsIgnoreCase("clear");
    }

    private void openProfile(Player viewer, String requestedName, String response) {
        String displayName = jsonString(response, "displayName", requestedName);
        String nortixUsername = jsonString(response, "nortixUsername", requestedName);
        String reputationTier = jsonString(response, "reputationTier", "Nortix member");
        int testerLevel = jsonNumber(response, "testerLevel");
        int reputationScore = jsonNumber(response, "reputationScore");
        int verifiedMilestones = jsonNumber(response, "verifiedMilestones");
        Inventory inventory = Bukkit.createInventory(null, 27, "Nortix · " + requestedName);

        ItemStack head = new ItemStack(Material.PLAYER_HEAD);
        SkullMeta headMeta = (SkullMeta) head.getItemMeta();
        if (headMeta != null) {
            headMeta.setOwningPlayer(Bukkit.getOfflinePlayer(requestedName));
            headMeta.setDisplayName(ChatColor.GREEN + displayName);
            headMeta.setLore(Arrays.asList(
                ChatColor.GRAY + "@" + nortixUsername,
                ChatColor.DARK_GRAY + "Verified Nortix profile"
            ));
            head.setItemMeta(headMeta);
        }
        inventory.setItem(11, head);
        inventory.setItem(13, profileItem(
            Material.EXPERIENCE_BOTTLE,
            ChatColor.LIGHT_PURPLE + reputationTier,
            ChatColor.GRAY + "Tester level: " + ChatColor.WHITE + testerLevel,
            ChatColor.GRAY + "Reputation: " + ChatColor.WHITE + reputationScore
        ));
        inventory.setItem(15, profileItem(
            Material.WRITABLE_BOOK,
            ChatColor.AQUA + "Verified activity",
            ChatColor.GRAY + "Milestones: " + ChatColor.WHITE + verifiedMilestones,
            ChatColor.DARK_GRAY + "Private campaign details are never shown."
        ));
        viewer.openInventory(inventory);
    }

    private void openMissingProfile(Player viewer, String requestedName) {
        Inventory inventory = Bukkit.createInventory(null, 27, "Nortix · " + requestedName);
        inventory.setItem(13, profileItem(
            Material.BARRIER,
            ChatColor.RED + "No Nortix profile",
            ChatColor.GRAY + "This user is not registered to Nortix.",
            ChatColor.DARK_GRAY + "Names are checked without exposing private account data."
        ));
        viewer.openInventory(inventory);
    }

    private ItemStack profileItem(Material material, String title, String... lore) {
        ItemStack item = new ItemStack(material);
        ItemMeta meta = item.getItemMeta();
        if (meta != null) {
            meta.setDisplayName(title);
            meta.setLore(Arrays.asList(lore));
            item.setItemMeta(meta);
        }
        return item;
    }

    private static String jsonString(String body, String key, String fallback) {
        Matcher matcher = Pattern.compile("\"" + Pattern.quote(key)
            + "\"\\s*:\\s*\"((?:\\\\.|[^\"])*)\"").matcher(body);
        return matcher.find() ? matcher.group(1).replace("\\\"", "\"").replace("\\\\", "\\") : fallback;
    }

    private static int jsonNumber(String body, String key) {
        Matcher matcher = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*(\\d+)").matcher(body);
        return matcher.find() ? Integer.parseInt(matcher.group(1)) : 0;
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
