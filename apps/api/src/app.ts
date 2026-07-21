import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { ZodError } from "zod";
import type { Env } from "./config/env.js";
import { authPlugin } from "./plugins/auth.js";
import { registerRoutes } from "./modules/routes.js";

export const buildApp = async (env: Env) => {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn",
      redact: [
        "req.headers.authorization",
        "req.headers.x-nortix-signature",
        "body.payoutDestinationReference",
        "body.token",
        "body.code",
      ],
    },
    genReqId: () => crypto.randomUUID(),
    trustProxy: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.WEB_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await app.register(authPlugin, { env });
  await registerRoutes(app, env);

  app.setNotFoundHandler((request, reply) =>
    reply
      .code(404)
      .send({
        code: "NOT_FOUND",
        message: "The requested endpoint does not exist.",
        requestId: request.id,
      }),
  );
  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "request failed");
    if (error instanceof ZodError) {
      return reply
        .code(400)
        .send({
          code: "VALIDATION_ERROR",
          message: "The submitted data is invalid.",
          details: error.issues,
          requestId: request.id,
        });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    const explicitStatus =
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : undefined;
    const safeMessages = [
      "not found",
      "only create",
      "not currently available",
      "full",
      "does not belong",
      "required",
      "available earnings",
      "not enough Sparks",
      "not available",
      "cannot transition",
      "draft campaigns",
      "verification",
      "publicly reachable",
      "public server address",
      "live Minecraft server",
      "address validation",
      "status ping",
      "public server MOTD",
      "verified proxy network",
      "invite",
      "team member",
      "username",
      "already",
      "expired",
      "server owner",
      "plugin token",
      "milestone tracking",
      "plugin capabilities",
      "integration evidence",
      "integration events",
      "instance verification",
      "delivery window",
      "victim UUID",
      "advertised capability",
      "inactive campaign",
      "calculated by the backend",
      "server access",
      "reserve",
      "linked",
      "played on this server",
      "Minecraft identity",
      "Minecraft account",
      "syncing previous player names",
      "Campaign Credits",
      "campaign budget",
    ];
    const expose = safeMessages.some((phrase) =>
      message.toLowerCase().includes(phrase.toLowerCase()),
    );
    const statusCode = explicitStatus && explicitStatus >= 400 && explicitStatus < 500
      ? explicitStatus
      : expose ? 400 : 500;
    return reply.code(statusCode).send({
      code: statusCode === 500 ? "INTERNAL_ERROR" : "DOMAIN_ERROR",
      message: expose ? message : "The request could not be completed.",
      requestId: request.id,
    });
  });

  return app;
};
