package com.nortix.paper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

final class MilestoneReporterRuntimeTest {
    @Test
    void preservesStoreCommandsAndEscapedPayloadData() throws Exception {
        String response = "{\"delivery\":{\"id\":\"delivery-runtime-1\",\"commands\":["
            + "\"lp user Alex parent add vip\","
            + "\"tell Alex line one\\nline two\","
            + "\"say \\\"quoted\\\"\","
            + "\"path\\\\segment\"]}}";

        assertEquals("delivery-runtime-1", invokeStringValue(response, "id"));
        assertEquals(
            Arrays.asList(
                "lp user Alex parent add vip",
                "tell Alex line one\nline two",
                "say \"quoted\"",
                "path\\segment"
            ),
            invokeStringArray(response, "commands")
        );
        assertTrue(invokeStringArray("{\"commands\":[]}", "commands").isEmpty());
        assertTrue(invokeStringArray("{}", "commands").isEmpty());
    }

    @Test
    void usesPayloadIdsForRetrySafeEventDelivery() throws Exception {
        assertEquals(
            "event_runtime-123",
            invokeIdempotencyKey("{\"id\":\"event_runtime-123\",\"type\":\"PLAYER_JOIN\"}")
        );
        String generated = invokeIdempotencyKey("{\"type\":\"PLAYER_JOIN\"}");
        assertEquals(generated, UUID.fromString(generated).toString());
    }

    @Test
    void safelySerializesCapabilityAndEventMetadata() {
        PluginCapability capability = new PluginCapability(
            "custom-provider",
            "Quoted \"Provider\"",
            "SKYBLOCK",
            "1.0\\beta",
            "%value%",
            "SKYBLOCK_LEVEL"
        );
        String serialized = capability.toJson();

        assertTrue(serialized.contains("\"provider\":\"Quoted \\\"Provider\\\"\""));
        assertTrue(serialized.contains("\"version\":\"1.0\\\\beta\""));
        assertTrue(serialized.contains("\"metrics\":[\"SKYBLOCK_LEVEL\"]"));
        assertEquals("line\\n\\\"quoted\\\"", MilestoneReporter.json("line\n\"quoted\""));
    }

    @Test
    void normalizesPlaceholderNumbersAndRejectsNonNumericValues() throws Exception {
        assertEquals(1234.5d, invokeParseNumber("1,234.5 levels"));
        assertEquals(-8.0d, invokeParseNumber("-8 hearts"));
        assertTrue(Double.isNaN(invokeParseNumber("not available")));
        assertTrue(Double.isNaN(invokeParseNumber("-")));
    }

    @Test
    void buildsACompleteServerBoundCrackedClaimPayload() {
        String body = MilestoneReporter.crackedClaimBody(
            "server-one",
            "instance-runtime-1",
            "NX-C-A1B2-C3D4",
            "123e4567-e89b-12d3-a456-426614174000",
            "Alex_Builder",
            "2026-07-29T12:00:00Z"
        );

        assertTrue(body.contains("\"serverId\":\"server-one\""));
        assertTrue(body.contains("\"instanceId\":\"instance-runtime-1\""));
        assertTrue(body.contains("\"claimCode\":\"NX-C-A1B2-C3D4\""));
        assertTrue(body.contains("\"minecraftUsername\":\"Alex_Builder\""));
        assertTrue(body.contains("\"occurredAt\":\"2026-07-29T12:00:00Z\""));
    }

    private static String invokeIdempotencyKey(String body) throws Exception {
        Method method = MilestoneReporter.class.getDeclaredMethod("idempotencyKey", String.class);
        method.setAccessible(true);
        return (String) method.invoke(null, body);
    }

    private static String invokeStringValue(String body, String key) throws Exception {
        Method method = MilestoneReporter.class.getDeclaredMethod(
            "jsonStringValue",
            String.class,
            String.class
        );
        method.setAccessible(true);
        return (String) method.invoke(null, body, key);
    }

    @SuppressWarnings("unchecked")
    private static List<String> invokeStringArray(String body, String key) throws Exception {
        Method method = MilestoneReporter.class.getDeclaredMethod(
            "jsonStringArray",
            String.class,
            String.class
        );
        method.setAccessible(true);
        return (List<String>) method.invoke(null, body, key);
    }

    private static double invokeParseNumber(String input) throws Exception {
        Method method = PluginAdapterRegistry.class.getDeclaredMethod("parseNumber", String.class);
        method.setAccessible(true);
        return (Double) method.invoke(null, input);
    }
}
