import * as paymentService from '../services/paymentService';
import config from '../config';
import type { WorkerStatus } from '../types';
import { Worker, formatIDR } from './types';

let timer: NodeJS.Timeout | null = null;
let tickCount = 0;
let lastRun: Date | null = null;
let lastError: string | null = null;

async function tick(): Promise<void> {
  try {
    const results = await paymentService.processTick();
    tickCount++;
    lastRun = new Date();
    lastError = null;

    for (const r of results) {
      const icon = r.payment.status === 'completed' ? '✓' : '✗';
      console.log(
        `[PAYMENT] ${icon} ${r.orderNumber} | ${r.payment.method} | ` +
          `${formatIDR(r.payment.amount)} | ${r.payment.status}` +
          (r.orderPaid ? '  ★ ORDER CLOSED' : '')
      );
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    console.error('[PAYMENT] Error:', lastError);
  }
}

export const paymentProcessor: Worker = {
  start(): void {
    if (timer) return;
    console.log('[PAYMENT] Worker started');
    timer = setInterval(() => void tick(), config.simulation.payment.intervalMs);
  },
  stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
      console.log('[PAYMENT] Worker stopped');
    }
  },
  status(): WorkerStatus {
    return { running: timer !== null, tickCount, lastRun, lastError };
  },
};
