package com.nortix.velocity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import java.lang.reflect.Method;
import java.util.UUID;
import org.junit.jupiter.api.Test;

final class NortixVelocityRuntimeTest {
    @Test
    void normalizesVerificationCodesAndEscapesSignedPayloadValues() throws Exception {
        assertEquals("NORTIX-A1B2-C3D4", invokeString("normalize", "  nortix-a1b2-c3d4  "));
        assertEquals("", invokeString("normalize", (String) null));
        assertEquals("proxy\\\\one\\\"blue", invokeString("json", "proxy\\one\"blue"));
    }

    @Test
    void readsOnlyThePublicProfileFieldsUsedByTheCommand() throws Exception {
        String response = "{\"displayName\":\"Alex \\\"Builder\\\"\","
            + "\"nortixUsername\":\"alex\","
            + "\"testerLevel\":7,\"reputationScore\":240,\"verifiedMilestones\":12,"
            + "\"privateAccountId\":\"must-not-be-used\"}";

        assertEquals("Alex \"Builder\"", invokeJsonValue(response, "displayName", "fallback"));
        assertEquals("alex", invokeJsonValue(response, "nortixUsername", "fallback"));
        assertEquals("fallback", invokeJsonValue(response, "missing", "fallback"));
        assertEquals(7, invokeNumberValue(response, "testerLevel"));
        assertEquals(0, invokeNumberValue(response, "missing"));
    }

    @Test
    void reusesEventIdsButGeneratesFreshKeysForSnapshotRequests() throws Exception {
        assertEquals(
            "presence_runtime-1",
            invokeIdempotencyKey("{\"id\":\"presence_runtime-1\",\"onlinePlayers\":2}")
        );
        String first = invokeIdempotencyKey("{}");
        String second = invokeIdempotencyKey("{}");
        assertEquals(first, UUID.fromString(first).toString());
        assertEquals(second, UUID.fromString(second).toString());
        assertNotEquals(first, second);
    }

    private static String invokeString(String methodName, String value) throws Exception {
        Method method = NortixVelocityPlugin.class.getDeclaredMethod(methodName, String.class);
        method.setAccessible(true);
        return (String) method.invoke(null, value);
    }

    private static String invokeJsonValue(String body, String key, String fallback) throws Exception {
        Method method = NortixVelocityPlugin.class.getDeclaredMethod(
            "jsonValue",
            String.class,
            String.class,
            String.class
        );
        method.setAccessible(true);
        return (String) method.invoke(null, body, key, fallback);
    }

    private static int invokeNumberValue(String body, String key) throws Exception {
        Method method = NortixVelocityPlugin.class.getDeclaredMethod(
            "numberValue",
            String.class,
            String.class
        );
        method.setAccessible(true);
        return (Integer) method.invoke(null, body, key);
    }

    private static String invokeIdempotencyKey(String body) throws Exception {
        Method method = NortixVelocityPlugin.class.getDeclaredMethod("idempotencyKey", String.class);
        method.setAccessible(true);
        return (String) method.invoke(null, body);
    }
}
