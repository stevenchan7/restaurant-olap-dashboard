import * as kitchenService from '../services/kitchenService';
import config from '../config';
import type { WorkerStatus } from '../types';
import { Worker } from './types';

let timer: NodeJS.Timeout | null = null;
let tickCount = 0;
let lastRun: Date | null = null;
let lastError: string | null = null;

async function tick(): Promise<void> {
  try {
    const results = await kitchenService.processTick();
    tickCount++;
    lastRun = new Date();
    lastError = null;

    for (const r of results) {
      console.log(
        `[KITCHEN] ${r.orderNumber} item #${r.item.id} → ${r.item.status}` +
          (r.orderReady ? '  ★ ORDER READY FOR PAYMENT' : '')
      );
    }
    if (results.length > 0) {
      console.log(`[KITCHEN] Tick #${tickCount}: advanced ${results.length} item(s)`);
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    console.error('[KITCHEN] Error:', lastError);
  }
}

export const kitchenProcessor: Worker = {
  start(): void {
    if (timer) return;
    console.log('[KITCHEN] Worker started');
    timer = setInterval(() => void tick(), config.simulation.kitchen.intervalMs);
  },
  stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
      console.log('[KITCHEN] Worker stopped');
    }
  },
  status(): WorkerStatus {
    return { running: timer !== null, tickCount, lastRun, lastError };
  },
};
