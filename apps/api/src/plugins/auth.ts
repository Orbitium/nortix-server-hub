import { applicationDefault, getApps, cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { prisma } from "@nortix/database";
import { rolePermissions, type Permission, type UserRole } from "@nortix/shared";
import type { Env } from "../config/env.js";
import { resolveMockUserId } from "./mock-auth.js";

const hasPermission = (roles: readonly string[], permission: Permission) =>
  roles.some((role) => rolePermissions[role as UserRole]?.includes(permission));

export const authPlugin = fp(async (app: FastifyInstance, options: { env: Env }) => {
  const { env } = options;
  const hasInlineAdminCredential = Boolean(
    env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY,
  );
  const hasAdminCredential = Boolean(
    env.GOOGLE_APPLICATION_CREDENTIALS || hasInlineAdminCredential,
  );
  if (env.AUTH_MODE === "firebase" && getApps().length === 0) {
    initializeApp(
      hasInlineAdminCredential
        ? {
            projectId: env.FIREBASE_PROJECT_ID!,
            credential: cert({
              projectId: env.FIREBASE_PROJECT_ID!,
              clientEmail: env.FIREBASE_CLIENT_EMAIL!,
              privateKey: env.FIREBASE_PRIVATE_KEY!.replaceAll("\\n", "\n"),
            }),
          }
        : env.GOOGLE_APPLICATION_CREDENTIALS
          ? {
              projectId: env.FIREBASE_PROJECT_ID!,
              credential: applicationDefault(),
            }
          : { projectId: env.FIREBASE_PROJECT_ID! },
    );
  }

  app.decorateRequest("user", null);

  app.decorate("authenticate", async (request, reply) => {
    const authorization = request.headers.authorization;
    let firebaseUid: string;
    let email: string;
    let displayName: string;

    if (env.AUTH_MODE === "mock") {
      const mockUid = resolveMockUserId(request.headers["x-mock-user"]);
      if (!mockUid) {
        await reply
          .code(401)
          .send({ code: "UNAUTHENTICATED", message: "An explicit local mock user is required." });
        return;
      }
      firebaseUid = mockUid;
      email = `${mockUid}@example.test`;
      displayName = "Local Tester";
    } else {
      if (!authorization?.startsWith("Bearer ")) {
        await reply
          .code(401)
          .send({ code: "UNAUTHENTICATED", message: "A valid sign-in token is required." });
        return;
      }
      try {
        const token = await getAuth().verifyIdToken(authorization.slice(7), hasAdminCredential);
        firebaseUid = token.uid;
        email = token.email ?? `${token.uid}@firebase.local`;
        displayName = token.name ?? "Nortix member";
      } catch {
        await reply
          .code(401)
          .send({ code: "INVALID_TOKEN", message: "The sign-in token is invalid or expired." });
        return;
      }
    }

    const usernameBase =
      email
        .split("@")[0]!
        .replace(/[^a-zA-Z0-9_]/g, "")
        .slice(0, 24)
        .toLowerCase() || "player";
    request.user = await prisma.user.upsert({
      where: { firebaseUid },
      update: { lastActiveAt: new Date(), email, displayName },
      create: {
        firebaseUid,
        email,
        displayName,
        username: `${usernameBase}-${firebaseUid.slice(-5)}`,
        roles: ["PLAYER"],
      },
    });
    if (request.user.status === "SUSPENDED" || request.user.status === "BANNED") {
      await reply.code(403).send({
        code: "ACCOUNT_RESTRICTED",
        message: "This account cannot access Nortix.",
      });
      request.user = null;
    }
  });

  app.decorate("requirePermission", (permission: Permission) => async (request, reply) => {
    await app.authenticate(request, reply);
    if (reply.sent) return;
    if (!request.user || !hasPermission(request.user.roles, permission)) {
      await reply.code(403).send({
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
      });
    }
  });
});
