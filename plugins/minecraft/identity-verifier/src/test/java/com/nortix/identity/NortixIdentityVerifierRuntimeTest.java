package com.nortix.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;

final class NortixIdentityVerifierRuntimeTest {
    @Test
    void createsStableSha256HmacSignaturesWithoutLeakingTheSecret() throws Exception {
        String canonical = "2026-07-29T12:00:00Z.nonce.NX-A1B2-C3D4-E5F6."
            + "123e4567-e89b-42d3-a456-426614174000.Alex";
        String secret = "runtime-test-secret-that-is-at-least-32-characters";
        String first = invokeHmac(canonical, secret);
        String second = invokeHmac(canonical, secret);

        assertEquals(first, second);
        assertEquals(64, first.length());
        assertTrue(first.matches("^[a-f0-9]{64}$"));
        assertNotEquals(first, invokeHmac(canonical + "x", secret));
        assertNotEquals(first, invokeHmac(canonical, secret + "x"));
    }

    @Test
    void sanitizesErrorsAndEscapesIdentityPayloadValues() throws Exception {
        assertEquals("HTTP 409", invokeSafeStatus("HTTP 409"));
        assertEquals("request failed", invokeSafeStatus("connection refused at internal-host"));
        assertEquals("request failed", invokeSafeStatus(null));
        assertEquals("Alex\\\\\\\"Admin", invokeJson("Alex\\\"Admin"));
    }

    private static String invokeHmac(String value, String secret) throws Exception {
        Method method = NortixIdentityVerifierPlugin.class.getDeclaredMethod(
            "hmac",
            String.class,
            String.class
        );
        method.setAccessible(true);
        return (String) method.invoke(null, value, secret);
    }

    private static String invokeJson(String value) throws Exception {
        Method method = NortixIdentityVerifierPlugin.class.getDeclaredMethod("json", String.class);
        method.setAccessible(true);
        return (String) method.invoke(null, value);
    }

    private static String invokeSafeStatus(String value) throws Exception {
        Method method = NortixIdentityVerifierPlugin.class.getDeclaredMethod(
            "safeStatus",
            String.class
        );
        method.setAccessible(true);
        return (String) method.invoke(null, value);
    }
}
