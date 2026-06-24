import * as orderService from "../services/orderService";
import config from "../config";
import type { WorkerStatus } from "../types";
import { Worker, formatIDR } from "./types";

let timer: NodeJS.Timeout | null = null;
let tickCount = 0;
let lastRun: Date | null = null;
let lastError: string | null = null;

function jitteredInterval(base: number, jitter: number): number {
  const factor = 1 + (Math.random() * 2 - 1) * jitter;
  return Math.round(base * factor);
}

function scheduleNext(): void {
  const { intervalMs, jitter } = config.simulation.orderGenerator;
  const delay = jitteredInterval(intervalMs, jitter);

  timer = setTimeout(async () => {
    try {
      const order = await orderService.generateRandomOrder();
      tickCount++;
      lastRun = new Date();
      lastError = null;

      console.log(
        `[ORDER] #${tickCount} Created ${order.order_number} | ` +
          `${order.items.length} items | ` +
          `Total: ${formatIDR(order.total_amount)}`,
      );
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error("[ORDER] Error:", lastError);
    }
    scheduleNext();
  }, delay);
}

export const orderGenerator: Worker = {
  start: () => {
    if (timer) return;
    console.log("[ORDER] Worker started");
    scheduleNext();
  },
  stop: () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      console.log("[ORDER] Worker stopped");
    }
  },
  status: (): WorkerStatus => {
    return { running: timer !== null, tickCount, lastRun, lastError };
  },
};
