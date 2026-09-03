import { toNodeHandler } from "better-auth/node";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { auth } from "./src/auth/index.ts";
import { pool } from "./src/config/db.ts";
import { env, isProduction } from "./src/config/env.ts";
import { logger } from "./src/lib/logger.ts";
import {
  errorHandler,
  notFoundHandler,
} from "./src/middleware/error.middleware.ts";
import { UPLOAD_DIR } from "./src/middleware/upload.middleware.ts";
import { apiRouter } from "./src/routes/index.ts";
import { setupSwagger } from "./src/config/swagger.ts";

const app = express();
app.set("trust proxy", 1);

app.use(helmet());

const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: CORS_ORIGINS,
    credentials: true,
  }),
);

app.use(compression());

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    skip: (req) => req.path.startsWith("/api/auth"),
  }),
);

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Liveness probe
 *     description: >
 *       Reports that the HTTP process is up and serving. Used by the platform
 *       health check and by uptime monitoring; it performs no database work, so
 *       a 200 here means the process is alive, not that every dependency is.
 *       Authentication is not required.
 *     operationId: getHealth
 *     security: []
 *     responses:
 *       200:
 *         description: The service is accepting traffic.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *             example:
 *               status: ok
 *               timestamp: '2026-08-03T09:14:52.318Z'
 */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/uploads", express.static(UPLOAD_DIR));

app.use("/api", apiRouter);

setupSwagger(app);

app.use(notFoundHandler);
app.use(errorHandler);

startServer();

async function startServer(): Promise<void> {
  try {
    await pool.query("select 1");
    logger.info("connected to postgres database");
    app.listen(env.PORT, () => {
      logger.info(`backend running at http://localhost:${env.PORT}`);
    });
  } catch (error) {
    logger.error({ err: error }, "failed to connect to PostgreSQL");
    process.exit(1);
  }
}

export { app, isProduction };
