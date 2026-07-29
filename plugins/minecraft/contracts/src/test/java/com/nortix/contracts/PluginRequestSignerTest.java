package com.nortix.contracts;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.Signature;
import java.security.interfaces.ECPrivateKey;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

final class PluginRequestSignerTest {
    @Test
    void signsTheExactCanonicalRequestExpectedByTheApi() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair pair = generator.generateKeyPair();
        byte[] scalar = fixedWidth(((ECPrivateKey) pair.getPrivate()).getS(), 32);
        String privateKey = "p256_" + Base64.getUrlEncoder().withoutPadding().encodeToString(scalar);
        PluginRequestSigner signer = new PluginRequestSigner(
            "server_runtime_1",
            "credential_runtime_1",
            privateKey
        );
        CapturingConnection connection = new CapturingConnection();
        String body = "{\"id\":\"event-runtime-1\",\"onlinePlayers\":12}";

        signer.sign(connection, "post", "/plugin/events", body, "event-runtime-1");

        String timestamp = connection.header("X-Nortix-Timestamp");
        String nonce = connection.header("X-Nortix-Nonce");
        String signature = connection.header("X-Nortix-Signature");
        assertEquals("server_runtime_1", connection.header("X-Nortix-Server-Id"));
        assertEquals("credential_runtime_1", connection.header("X-Nortix-Key-Id"));
        assertEquals("event-runtime-1", connection.header("Idempotency-Key"));
        assertNotNull(Instant.parse(timestamp));
        assertNotNull(UUID.fromString(nonce));
        assertFalse(signature.contains("="), "The API contract uses unpadded base64url signatures.");

        String canonical = "POST\n/plugin/events\nserver_runtime_1\ncredential_runtime_1\n"
            + timestamp + "\n" + nonce + "\nevent-runtime-1\n" + sha256(body);
        Signature verifier = Signature.getInstance("SHA256withECDSA");
        verifier.initVerify(pair.getPublic());
        verifier.update(canonical.getBytes(StandardCharsets.UTF_8));
        assertTrue(verifier.verify(Base64.getUrlDecoder().decode(signature)));

        verifier.initVerify(pair.getPublic());
        verifier.update((canonical + "\ntampered").getBytes(StandardCharsets.UTF_8));
        assertFalse(verifier.verify(Base64.getUrlDecoder().decode(signature)));
    }

    @Test
    void createsFreshReplayProtectionHeadersForEveryRequest() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair pair = generator.generateKeyPair();
        String privateKey = "p256_" + Base64.getUrlEncoder().withoutPadding().encodeToString(
            fixedWidth(((ECPrivateKey) pair.getPrivate()).getS(), 32)
        );
        PluginRequestSigner signer = new PluginRequestSigner("server-1", "credential-1", privateKey);
        CapturingConnection first = new CapturingConnection();
        CapturingConnection second = new CapturingConnection();

        signer.sign(first, "GET", "/plugin/presence", null, "presence-runtime-1");
        signer.sign(second, "GET", "/plugin/presence", null, "presence-runtime-1");

        assertNotEquals(first.header("X-Nortix-Nonce"), second.header("X-Nortix-Nonce"));
        assertEquals(
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            sha256("")
        );
    }

    @Test
    void rejectsIncompleteOrMalformedCredentialsBeforeAnyNetworkCall() {
        assertThrows(
            IllegalArgumentException.class,
            () -> new PluginRequestSigner("", "credential-1", "p256_invalid")
        );
        assertThrows(
            IllegalArgumentException.class,
            () -> new PluginRequestSigner("server-1", "", "p256_invalid")
        );
        assertThrows(
            IllegalArgumentException.class,
            () -> new PluginRequestSigner("server-1", "credential-1", "legacy-token")
        );
        assertThrows(
            IllegalArgumentException.class,
            () -> new PluginRequestSigner(
                "server-1",
                "credential-1",
                "p256_" + Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[31])
            )
        );
    }

    private static byte[] fixedWidth(java.math.BigInteger value, int width) {
        byte[] source = value.toByteArray();
        byte[] result = new byte[width];
        int sourceStart = Math.max(0, source.length - width);
        int length = Math.min(source.length, width);
        System.arraycopy(source, sourceStart, result, width - length, length);
        return result;
    }

    private static String sha256(String value) throws Exception {
        byte[] hash = MessageDigest.getInstance("SHA-256")
            .digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder result = new StringBuilder(hash.length * 2);
        for (byte item : hash) result.append(String.format("%02x", item & 0xff));
        return result.toString();
    }

    private static final class CapturingConnection extends HttpURLConnection {
        private final Map<String, String> headers = new LinkedHashMap<>();

        CapturingConnection() throws Exception {
            super(new URL("https://local.invalid/plugin"));
        }

        @Override
        public void setRequestProperty(String key, String value) {
            headers.put(key, value);
        }

        String header(String name) {
            return headers.get(name);
        }

        @Override
        public void disconnect() {
        }

        @Override
        public boolean usingProxy() {
            return false;
        }

        @Override
        public void connect() throws IOException {
        }
    }
}
