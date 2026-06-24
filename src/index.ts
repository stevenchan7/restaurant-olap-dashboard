import express, { Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parse as parseYaml } from "yaml";
import config from "./config";
import { runMigrations } from "./db/migrate";
import { pool } from "./db/pool";

import { orderGenerator } from "./workers/orderGenerator";
import { kitchenProcessor } from "./workers/kitchenProcessor";
import { paymentProcessor } from "./workers/paymentProcessor";
import type { Worker } from "./workers/types";

import * as orderRepo from "./repositories/orderRepo";
import * as orderItemRepo from "./repositories/orderItemRepo";
import * as paymentRepo from "./repositories/paymentRepo";
import type { OrderStatus } from "./types";

const app = express();
app.use(express.json());

const swaggerDoc = parseYaml(
  readFileSync(resolve(__dirname, "../swagger.yaml"), "utf-8"),
);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Tiny async wrapper so route handlers can throw and we still get a response
const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };

const workers: Record<string, Worker> = {
  order: orderGenerator,
  kitchen: kitchenProcessor,
  payment: paymentProcessor,
};

// ─── Health & Status ───────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/status", (_req, res) => {
  res.json({
    workers: {
      orderGenerator: orderGenerator.status(),
      kitchenProcessor: kitchenProcessor.status(),
      paymentProcessor: paymentProcessor.status(),
    },
  });
});

// ─── Worker Controls ───────────────────────────────────────

app.post("/simulator/start", (_req, res) => {
  Object.values(workers).forEach((w) => w.start());
  res.json({ message: "All workers started" });
});

app.post("/simulator/stop", (_req, res) => {
  Object.values(workers).forEach((w) => w.stop());
  res.json({ message: "All workers stopped" });
});

app.post("/simulator/:worker/start", (req, res) => {
  const w = workers[req.params.worker];
  if (!w) {
    res.status(404).json({ error: "Unknown worker" });
    return;
  }
  w.start();
  res.json({ message: `${req.params.worker} started` });
});

app.post("/simulator/:worker/stop", (req, res) => {
  const w = workers[req.params.worker];
  if (!w) {
    res.status(404).json({ error: "Unknown worker" });
    return;
  }
  w.stop();
  res.json({ message: `${req.params.worker} stopped` });
});

// ─── Data Endpoints ────────────────────────────────────────

const VALID_ORDER_STATUSES: OrderStatus[] = [
  "open",
  "awaiting_payment",
  "paid",
  "cancelled",
];

app.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    if (status) {
      if (!VALID_ORDER_STATUSES.includes(status as OrderStatus)) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }
      const orders = await orderRepo.findByStatus(status as OrderStatus);
      res.json(orders);
      return;
    }
    const stats = await orderRepo.getStats();
    res.json(stats);
  }),
);

app.get(
  "/orders/stats",
  asyncHandler(async (_req, res) => {
    const [orderStats, itemCounts] = await Promise.all([
      orderRepo.getStats(),
      orderItemRepo.getStatusCounts(),
    ]);
    res.json({ orders: orderStats, items: itemCounts });
  }),
);

app.get(
  "/payments/recent",
  asyncHandler(async (req, res) => {
    const limit = parseInt((req.query.limit as string) ?? "20", 10);
    const payments = await paymentRepo.getRecentPayments(limit);
    res.json(payments);
  }),
);

// Error handler (must have 4 args for express to recognize it)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[API]", err.message);
  res.status(500).json({ error: err.message });
});

// ─── Startup ───────────────────────────────────────────────

async function startup(): Promise<void> {
  try {
    const { rows } = await pool.query<{ time: Date }>("SELECT NOW() AS time");
    console.log(`[DB] Connected. Server time: ${rows[0].time.toISOString()}`);

    await runMigrations();

    app.listen(config.server.port, () => {
      console.log(
        `[SERVER] Listening on http://localhost:${config.server.port}`,
      );
      console.log(`[SERVER] POST /simulator/start to begin simulation`);
      console.log(`[SERVER] GET  /status to check worker status`);
      console.log(`[SERVER] GET  /orders/stats for live stats`);
      console.log(`[SERVER] GET  /docs for Swagger UI`);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[STARTUP] Failed:", message);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  console.log("\n[SHUTDOWN] Stopping workers...");
  Object.values(workers).forEach((w) => w.stop());
  console.log("[SHUTDOWN] Closing database pool...");
  await pool.end();
  console.log("[SHUTDOWN] Done.");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

void startup();
