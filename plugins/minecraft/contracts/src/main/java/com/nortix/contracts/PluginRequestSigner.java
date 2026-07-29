package com.nortix.contracts;

import java.math.BigInteger;
import java.net.HttpURLConnection;
import java.nio.charset.StandardCharsets;
import java.security.AlgorithmParameters;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPrivateKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

public final class PluginRequestSigner {
    private static final String PRIVATE_KEY_PREFIX = "p256_";
    private final String serverId;
    private final String keyId;
    private final PrivateKey privateKey;

    public PluginRequestSigner(String serverId, String keyId, String encodedPrivateKey) throws Exception {
        if (serverId == null || serverId.trim().isEmpty()) {
            throw new IllegalArgumentException("A Nortix server ID is required.");
        }
        if (keyId == null || keyId.trim().isEmpty()) {
            throw new IllegalArgumentException("A Nortix signing key ID is required.");
        }
        if (encodedPrivateKey == null || !encodedPrivateKey.startsWith(PRIVATE_KEY_PREFIX)) {
            throw new IllegalArgumentException("A valid Nortix P-256 private key is required.");
        }
        this.serverId = serverId.trim();
        this.keyId = keyId.trim();
        this.privateKey = decodePrivateKey(encodedPrivateKey.substring(PRIVATE_KEY_PREFIX.length()));
    }

    public void sign(
        HttpURLConnection connection,
        String method,
        String path,
        String body,
        String idempotencyKey
    ) throws Exception {
        String timestamp = Instant.now().toString();
        String nonce = UUID.randomUUID().toString();
        String bodyHash = hex(sha256(body == null ? new byte[0] : body.getBytes(StandardCharsets.UTF_8)));
        String canonical = method.toUpperCase() + "\n"
            + path + "\n"
            + serverId + "\n"
            + keyId + "\n"
            + timestamp + "\n"
            + nonce + "\n"
            + idempotencyKey + "\n"
            + bodyHash;
        Signature signer = Signature.getInstance("SHA256withECDSA");
        signer.initSign(privateKey);
        signer.update(canonical.getBytes(StandardCharsets.UTF_8));
        String signature = Base64.getUrlEncoder().withoutPadding().encodeToString(signer.sign());

        connection.setRequestProperty("X-Nortix-Server-Id", serverId);
        connection.setRequestProperty("X-Nortix-Key-Id", keyId);
        connection.setRequestProperty("X-Nortix-Timestamp", timestamp);
        connection.setRequestProperty("X-Nortix-Nonce", nonce);
        connection.setRequestProperty("X-Nortix-Signature", signature);
        connection.setRequestProperty("Idempotency-Key", idempotencyKey);
    }

    private static PrivateKey decodePrivateKey(String encoded) throws Exception {
        byte[] scalar = Base64.getUrlDecoder().decode(encoded);
        if (scalar.length != 32) throw new IllegalArgumentException("The Nortix private key is malformed.");
        AlgorithmParameters parameters = AlgorithmParameters.getInstance("EC");
        parameters.init(new ECGenParameterSpec("secp256r1"));
        ECParameterSpec curve = parameters.getParameterSpec(ECParameterSpec.class);
        return KeyFactory.getInstance("EC").generatePrivate(
            new ECPrivateKeySpec(new BigInteger(1, scalar), curve)
        );
    }

    private static byte[] sha256(byte[] value) throws Exception {
        return MessageDigest.getInstance("SHA-256").digest(value);
    }

    private static String hex(byte[] value) {
        StringBuilder output = new StringBuilder(value.length * 2);
        for (byte item : value) output.append(String.format("%02x", item & 0xff));
        return output.toString();
    }
}
